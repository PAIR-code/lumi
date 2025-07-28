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
    highlighted_spans: Optional[List[HighlightSelection]] = None
    highlighted_span_id: Optional[str] = None


@dataclass
class LumiAnswer:
    """A Lumi answer object, containing the response and citations."""

    id: str
    request: LumiAnswerRequest
    response_content: List[LumiContent]
    timestamp: int
