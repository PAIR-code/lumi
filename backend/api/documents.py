import logging

from fastapi import APIRouter, HTTPException, status
from utils.surreal_utils import get_document_version

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{arxiv_id}/{version}")
async def get_document(arxiv_id: str, version: str):
    """
    Get full LumiDoc for a paper version

    Replaces: Real-time Firestore listener for document
    Returns: Complete document with sections, summaries, etc.
    """
    doc = await get_document_version(arxiv_id, version)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    return doc


@router.get("/{arxiv_id}/{version}/sections")
async def get_document_sections(arxiv_id: str, version: str):
    """
    Get only sections (lighter weight than full document)

    Useful for rendering table of contents
    """
    doc = await get_document_version(arxiv_id, version)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    return {
        "arxiv_id": arxiv_id,
        "version": version,
        "sections": doc.get("sections", []),
    }
