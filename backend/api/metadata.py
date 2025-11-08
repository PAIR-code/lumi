import logging

from database import get_db
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{arxiv_id}")
async def get_arxiv_metadata(arxiv_id: str):
    """
    Get paper metadata (replaces Firebase callable)

    Returns metadata for gallery display. Fetches from document_versions table
    and returns the metadata field from the latest version.
    """
    db = get_db()

    # Query document_versions for the latest version
    try:
        query = f"""
            SELECT * FROM document_versions
            WHERE arxiv_id = '{arxiv_id}'
            ORDER BY updated_timestamp DESC
            LIMIT 1
        """
        result = await db.query(query)

        if result and len(result) > 0 and "result" in result[0]:
            docs = result[0]["result"]
            if docs and len(docs) > 0:
                doc = docs[0]
                if "metadata" in doc and doc["metadata"]:
                    logger.info(f"Found metadata for {arxiv_id}")
                    return doc["metadata"]
    except Exception as e:
        logger.error(f"Error fetching metadata for {arxiv_id}: {e}")

    # Not found
    logger.error(f"Metadata not found for {arxiv_id}")
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found"
    )
