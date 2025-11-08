"""SurrealDB utility functions"""

import logging
from datetime import datetime
from typing import Any

from database import get_db

logger = logging.getLogger(__name__)


def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def convert_keys_to_camel(data: Any) -> Any:
    """
    Recursively convert dictionary keys from snake_case to camelCase.
    Handles nested dicts and lists.
    """
    if isinstance(data, dict):
        return {snake_to_camel(k): convert_keys_to_camel(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_camel(item) for item in data]
    else:
        return data


def format_record_id(table: str, identifier: str) -> str:
    """
    Format SurrealDB record ID

    Args:
        table: Table name
        identifier: Unique identifier (will be sanitized)

    Returns:
        Formatted record ID (e.g., "arxiv_docs:2301_07041")
    """
    # Replace dots with underscores (arXiv IDs have dots)
    sanitized = identifier.replace(".", "_").replace("/", "_")
    return f"{table}:{sanitized}"


def parse_record_id(record_id: str) -> tuple[str, str]:
    """
    Parse SurrealDB record ID into table and identifier

    Args:
        record_id: Record ID (e.g., "arxiv_docs:2301_07041")

    Returns:
        Tuple of (table, identifier)
    """
    if ":" in record_id:
        table, identifier = record_id.split(":", 1)
        # Restore dots in arXiv IDs
        identifier = identifier.replace("_", ".")
        return table, identifier
    return "", record_id


async def get_document_version(arxiv_id: str, version: str) -> dict[str, Any] | None:
    """
    Fetch a document version from database

    Args:
        arxiv_id: ArXiv paper ID (e.g., "2301.07041")
        version: Version string (e.g., "1")

    Returns:
        Document dict or None if not found
    """
    import json

    db = get_db()
    record_id = format_record_id("document_versions", f"{arxiv_id}_v{version}")

    try:
        result = await db.select(record_id)
        if not isinstance(result, dict):
            return None

        # Parse JSON string fields back to objects
        json_fields = [
            "sections",
            "concepts",
            "abstract",
            "references",
            "footnotes",
            "summaries",
        ]
        for field in json_fields:
            if field in result and isinstance(result[field], str):
                try:
                    result[field] = json.loads(result[field])
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Failed to parse {field} for {arxiv_id} v{version}")
                    result[field] = (
                        []
                        if field in ["sections", "concepts", "references", "footnotes"]
                        else {}
                    )

        return result
    except Exception as e:
        logger.error(f"Error fetching document version {arxiv_id} v{version}: {e}")
        return None


async def update_document_status(
    arxiv_id: str, version: str, status: str, error: str | None = None
) -> bool:
    """
    Update document loading status

    Args:
        arxiv_id: ArXiv paper ID
        version: Version string
        status: New loading status
        error: Optional error message

    Returns:
        True if successful, False otherwise
    """
    db = get_db()
    record_id = format_record_id("document_versions", f"{arxiv_id}_v{version}")

    update_data = {
        "loading_status": status,
        "updated_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    if error:
        update_data["loading_error"] = error

    try:
        await db.merge(record_id, update_data)

        # Also update parent document
        parent_id = format_record_id("arxiv_docs", arxiv_id)
        await db.merge(parent_id, update_data)

        logger.info(f"Updated status for {arxiv_id} v{version}: {status}")
        return True
    except Exception as e:
        logger.error(f"Error updating document status: {e}")
        return False


async def create_document_version(
    arxiv_id: str, version: str, metadata: dict, status: str = "WAITING"
) -> str | None:
    """
    Create a new document version record

    Args:
        arxiv_id: ArXiv paper ID
        version: Version string
        metadata: Paper metadata
        status: Initial loading status

    Returns:
        Record ID if successful, None otherwise
    """
    db = get_db()

    # Create or update parent document first
    parent_id = format_record_id("arxiv_docs", arxiv_id)

    try:
        await db.query(f"""
            CREATE {parent_id} SET
                arxiv_id = '{arxiv_id}',
                loading_status = '{status}',
                updated_timestamp = time::now()
        """)
    except Exception:
        # May already exist, try update
        await db.query(f"""
            UPDATE {parent_id} SET
                loading_status = '{status}',
                updated_timestamp = time::now()
        """)

    # Create version document
    version_id = format_record_id("document_versions", f"{arxiv_id}_v{version}")

    try:
        # Use parameterized query to safely handle metadata
        await db.query(
            f"""
            CREATE {version_id} SET
                arxiv_id = $arxiv_id,
                version = $version,
                loading_status = $status,
                updated_timestamp = time::now(),
                metadata = $metadata,
                arxiv_doc = {parent_id}
        """,
            {
                "arxiv_id": arxiv_id,
                "version": version,
                "status": status,
                "metadata": metadata,
            },
        )
        logger.info(f"Created document version: {version_id}")
        return version_id
    except Exception as e:
        logger.error(f"Error creating document version: {e}")
        return None


async def check_throttle(max_attempts: int = 5, time_window: int = 60) -> bool:
    """
    Check if import throttling should be applied

    Args:
        max_attempts: Maximum attempts allowed
        time_window: Time window in seconds

    Returns:
        True if request should proceed, False if throttled
    """
    db = get_db()

    # Record this attempt
    await db.create(
        "import_attempts",
        {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "succeeded": True,
        },
    )

    # Query recent attempts
    cutoff_time = datetime.utcnow().timestamp() - time_window
    cutoff_iso = datetime.fromtimestamp(cutoff_time).isoformat()

    query = f"""
        SELECT * FROM import_attempts
        WHERE timestamp > '{cutoff_iso}'
        AND succeeded = true
        ORDER BY timestamp DESC
        LIMIT {max_attempts}
    """

    result = await db.query(query)
    attempts = result[0]["result"] if result and "result" in result[0] else []

    return len(attempts) < max_attempts
