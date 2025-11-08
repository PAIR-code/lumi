from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class LoadingStatus(str, Enum):
    """Document loading status"""

    UNSET = "UNSET"
    WAITING = "WAITING"
    SUMMARIZING = "SUMMARIZING"
    SUCCESS = "SUCCESS"
    ERROR_DOCUMENT_LOAD = "ERROR_DOCUMENT_LOAD"
    ERROR_DOCUMENT_LOAD_INVALID_RESPONSE = "ERROR_DOCUMENT_LOAD_INVALID_RESPONSE"
    ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED = "ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED"
    ERROR_SUMMARIZING = "ERROR_SUMMARIZING"
    ERROR_SUMMARIZING_QUOTA_EXCEEDED = "ERROR_SUMMARIZING_QUOTA_EXCEEDED"
    ERROR_SUMMARIZING_INVALID_RESPONSE = "ERROR_SUMMARIZING_INVALID_RESPONSE"
    TIMEOUT = "TIMEOUT"


@dataclass
class ArxivDocument:
    """
    Main arxiv_docs record (replaces Firestore top-level document)

    SurrealDB Table: arxiv_docs
    Record ID format: arxiv_docs:2301_07041
    """

    arxiv_id: str
    loading_status: LoadingStatus
    updated_timestamp: datetime

    # Record ID (set by SurrealDB)
    id: str | None = None


@dataclass
class DocumentVersion:
    """
    Paper version record (replaces Firestore subcollection)

    SurrealDB Table: document_versions
    Record ID format: document_versions:2301_07041_v1

    Relationship: Links to arxiv_docs via arxiv_doc field
    """

    arxiv_id: str
    version: str
    loading_status: LoadingStatus
    updated_timestamp: datetime
    loading_error: str | None = None

    # Metadata
    metadata: dict | None = None

    # LumiDoc fields (populated during import)
    markdown: str | None = None
    sections: list[dict] | None = None
    concepts: list[dict] | None = None
    abstract: dict | None = None
    references: list[dict] | None = None
    footnotes: list[dict] | None = None
    summaries: dict | None = None

    # Record ID and relationship
    id: str | None = None
    arxiv_doc: str | None = None  # Record link to arxiv_docs


@dataclass
class ArxivMetadata:
    """
    Lightweight metadata for gallery display

    Stored in document_versions.metadata field
    """

    arxiv_id: str
    paper_id: str
    version: str
    title: str
    authors: list[str]
    summary: str
    published_timestamp: datetime
    updated_timestamp: datetime

    # Optional featured image
    featured_image: dict | None = None

    id: str | None = None


@dataclass
class QueryLog:
    """
    User query log for analytics

    SurrealDB Table: query_logs
    Record ID: Auto-generated
    """

    created_timestamp: datetime
    arxiv_id: str
    version: str
    answer: dict

    id: str | None = None


@dataclass
class UserFeedback:
    """
    User feedback collection

    SurrealDB Table: user_feedback
    Record ID: Auto-generated
    """

    user_feedback_text: str
    created_timestamp: datetime
    arxiv_id: str | None = None

    id: str | None = None


@dataclass
class ImportAttempt:
    """
    Rate limiting for imports

    SurrealDB Table: import_attempts
    Record ID: Auto-generated
    """

    timestamp: datetime
    succeeded: bool

    id: str | None = None


@dataclass
class ArxivCollection:
    """
    Curated paper collections

    SurrealDB Table: arxiv_collections
    Record ID format: arxiv_collections:collection_name
    """

    collection_id: str
    title: str
    summary: str
    paper_ids: list[str]
    priority: int

    id: str | None = None
