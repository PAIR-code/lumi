import logging

from database import get_db
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()


class SaveUserFeedbackRequest(BaseModel):
    """User feedback submission"""

    user_feedback_text: str = Field(..., max_length=1000)
    arxiv_id: str | None = None


class SaveUserFeedbackResponse(BaseModel):
    """Feedback save response"""

    status: str


@router.post("/", response_model=SaveUserFeedbackResponse)
async def save_user_feedback(request: SaveUserFeedbackRequest):
    """
    Save user feedback (replaces Firebase callable)

    Stores user feedback with optional paper association
    """
    if not request.user_feedback_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_feedback_text must not be empty",
        )

    if len(request.user_feedback_text) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback text exceeds max length",
        )

    db = get_db()
    try:
        # Escape single quotes for SQL-like query (extract to variable to avoid backslash in f-string)
        escaped_text = request.user_feedback_text.replace("'", "\\'")
        arxiv_id_value = f"'{request.arxiv_id}'" if request.arxiv_id else "NONE"
        await db.query(f"""
            CREATE user_feedback SET
                user_feedback_text = '{escaped_text}',
                created_timestamp = time::now(),
                arxiv_id = {arxiv_id_value}
        """)
        logger.info(
            f"Saved feedback{' for ' + request.arxiv_id if request.arxiv_id else ''}"
        )
    except Exception as e:
        logger.error(f"Error saving feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save feedback",
        ) from e

    return SaveUserFeedbackResponse(status="success")
