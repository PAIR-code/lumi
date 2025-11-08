import logging

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class GetLumiResponseRequest(BaseModel):
    """Request for AI answer (stub for Phase 4)"""

    doc: dict
    request: dict
    api_key: str | None = None


@router.post("/answer")
async def get_lumi_response(request: GetLumiResponseRequest):
    """
    Generate AI answer to user query

    Phase 4 implementation will add: Full answer generation with LiteLLM
    """
    return {
        "message": "Query answering will be implemented in Phase 4",
        "status": "stub",
    }
