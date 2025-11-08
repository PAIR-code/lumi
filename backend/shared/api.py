# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

from dataclasses import dataclass
from typing import Any

from shared.lumi_doc import LumiContent, Position


@dataclass
class HighlightSelection:
    """Represents a highlighted section of a span."""

    span_id: str
    position: Position


@dataclass
class ImageInfo:
    """Information about an image for a request."""

    image_storage_path: str
    caption: str | None = None


@dataclass
class LumiAnswerRequest:
    """Request object for getting a Lumi answer."""

    query: str | None = None
    highlight: str | None = None
    highlighted_spans: list[HighlightSelection] | None = None
    image: ImageInfo | None = None


@dataclass
class LumiAnswer:
    """A Lumi answer object, containing the response and citations."""

    id: str
    request: LumiAnswerRequest
    response_content: list[LumiContent]
    timestamp: int


@dataclass
class QueryLog:
    """Schema for logging user queries to Firestore."""

    created_timestamp: (
        Any  # Firestore timestamp created with firestore_v1.SERVER_TIMESTAMP
    )
    answer: LumiAnswer
    arxiv_id: str
    version: str


@dataclass
class UserFeedback:
    """Schema for user feedback stored in Firestore."""

    user_feedback_text: str
    created_timestamp: (
        Any  # Firestore timestamp created with firestore_v1.SERVER_TIMESTAMP
    )
    arxiv_id: str | None = None
