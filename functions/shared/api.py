from dataclasses import dataclass
from typing import List, Optional
from shared.lumi_doc import LumiContent, Position


@dataclass
class HighlightSelection:
    """Represents a highlighted section of a span."""

    span_id: str
    position: Position


@dataclass
class LumiAnswerRequest:
    """Request object for getting a Lumi answer."""

    query: Optional[str] = None
    highlight: Optional[str] = None
    history: Optional[List["LumiAnswer"]] = None
    highlighted_spans: Optional[List[HighlightSelection]] = None
    highlighted_span_id: Optional[str] = None


@dataclass
class LumiAnswer:
    """A Lumi answer object, containing the response and citations."""

    id: str
    request: LumiAnswerRequest
    response_content: List[LumiContent]
    timestamp: int
