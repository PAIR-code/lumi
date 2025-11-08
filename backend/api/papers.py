import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from models.document import LoadingStatus
from pydantic import BaseModel, Field
from services.import_service import ImportService

# Import backend modules
from utils.surreal_utils import create_document_version, get_document_version

logger = logging.getLogger(__name__)
router = APIRouter()


class RequestArxivDocImportRequest(BaseModel):
    """Request to import an arXiv paper"""

    arxiv_id: str = Field(
        ..., max_length=20, description="ArXiv paper ID (e.g., '2301.07041')"
    )


class RequestArxivDocImportResponse(BaseModel):
    """Response from import request"""

    metadata: dict | None = None
    error: str | None = None
    message: str = "Import request received (full pipeline implementation in Phase 4)"


@router.post("/import", response_model=RequestArxivDocImportResponse)
async def request_arxiv_doc_import(
    request: RequestArxivDocImportRequest, background_tasks: BackgroundTasks
):
    """
    Request import of an arXiv paper (replaces Firebase callable)

    Phase 4: Creates document record, starts background import task
    Full pipeline integration requires functions/import_pipeline setup
    """
    arxiv_id = request.arxiv_id

    # Validate arxiv_id length
    if len(arxiv_id) > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect arxiv_id length"
        )

    # Check license and fetch metadata
    try:
        from import_pipeline import fetch_utils

        # Check license (will raise ValueError if invalid)
        fetch_utils.check_arxiv_license(arxiv_id)

        # Fetch real metadata from arXiv API
        metadata_list = fetch_utils.fetch_arxiv_metadata([arxiv_id])
        if not metadata_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found on arXiv"
            )

        arxiv_metadata = metadata_list[0]
        # Return camelCase to match frontend TypeScript interface
        metadata_dict = {
            "paperId": arxiv_metadata.paper_id,
            "version": arxiv_metadata.version,
            "title": arxiv_metadata.title,
            "authors": arxiv_metadata.authors,
            "summary": arxiv_metadata.summary,
            "updatedTimestamp": arxiv_metadata.updated_timestamp,
            "publishedTimestamp": arxiv_metadata.published_timestamp,
        }
        version = arxiv_metadata.version
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Error fetching metadata for {arxiv_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch paper metadata",
        ) from e

    try:
        version_id = await create_document_version(
            arxiv_id=arxiv_id,
            version=version,
            metadata=metadata_dict,
            status=LoadingStatus.WAITING.value,
        )

        if not version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create document record",
            )

        logger.info(f"Created import for {arxiv_id}")

        # Start background import task (Phase 4)
        import_service = ImportService()
        background_tasks.add_task(
            import_service.process_document_import,
            arxiv_id=arxiv_id,
            version=version,
            metadata=arxiv_metadata,
        )

        return RequestArxivDocImportResponse(
            metadata=metadata_dict,
            message="Import started in background. Connect to WebSocket for updates.",
        )
    except Exception as e:
        logger.error(f"Error creating import request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e


@router.get("/status/{arxiv_id}/{version}")
async def get_import_status(arxiv_id: str, version: str):
    """
    Get current import status for a paper

    Returns:
        {
            "arxiv_id": "2301.07041",
            "version": "1",
            "loading_status": "WAITING",
            "updated_timestamp": "2025-11-05T...",
            "loading_error": null
        }
    """
    doc = await get_document_version(arxiv_id, version)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Return camelCase for frontend
    return {
        "arxivId": doc.get("arxiv_id"),
        "version": doc.get("version"),
        "loadingStatus": doc.get("loading_status"),
        "updatedTimestamp": doc.get("updated_timestamp"),
        "loadingError": doc.get("loading_error"),
    }


@router.get("/document/{arxiv_id}/{version}")
async def get_document(arxiv_id: str, version: str):
    """
    Get complete document with all fields (sections, abstract, etc.)

    This endpoint returns the full LumiDoc structure with JSON fields already parsed.
    Used by frontend when loading a document page.

    Returns:
        Complete document dict with camelCase keys
    """
    from shared.json_utils import convert_keys

    doc = await get_document_version(arxiv_id, version)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Convert to camelCase for frontend TypeScript compatibility
    doc_camelcase = convert_keys(doc, "snake_to_camel")
    return doc_camelcase
