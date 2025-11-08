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
from enum import StrEnum
from typing import Optional

from shared.types import ArxivMetadata, LoadingStatus


@dataclass
class Position:
    start_index: int
    end_index: int


@dataclass
class Highlight:
    color: str
    span_id: str
    position: Position


@dataclass
class Citation:
    span_id: str
    position: Position


@dataclass
class CitedContent:
    text: str
    citations: list[Citation]


@dataclass
class Label:
    id: str
    label: str


@dataclass
class LumiSummary:
    id: str
    summary: "LumiSpan"


@dataclass
class LumiSummaries:
    section_summaries: list[LumiSummary]
    content_summaries: list[LumiSummary]
    span_summaries: list[LumiSummary]
    abstract_excerpt_span_id: str | None = None


@dataclass
class Heading:
    heading_level: int
    text: str


@dataclass
class ConceptContent:
    label: str
    value: str


@dataclass
class LumiConcept:
    id: str
    name: str
    contents: list[ConceptContent]
    in_text_citations: list[Label]


@dataclass
class LumiSection:
    id: str
    heading: Heading
    contents: list["LumiContent"]
    sub_sections: list["LumiSection"] | None = None


@dataclass
class TextContent:
    tag_name: str
    spans: list["LumiSpan"]


@dataclass
class ImageContent:
    storage_path: str
    latex_path: str
    alt_text: str
    width: float
    height: float
    caption: Optional["LumiSpan"] = None


@dataclass
class FigureContent:
    images: list[ImageContent]
    caption: Optional["LumiSpan"] = None


@dataclass
class HtmlFigureContent:
    html: str
    caption: Optional["LumiSpan"] = None


@dataclass
class ListContent:
    list_items: list["ListItem"]
    is_ordered: bool


@dataclass
class ListItem:
    spans: list["LumiSpan"]
    subListContent: ListContent | None = None


@dataclass
class LumiContent:
    id: str
    text_content: TextContent | None = None
    image_content: ImageContent | None = None
    figure_content: FigureContent | None = None
    html_figure_content: HtmlFigureContent | None = None
    list_content: ListContent | None = None


@dataclass
class LumiSpan:
    id: str
    text: str
    inner_tags: list["InnerTag"]


class InnerTagName(StrEnum):
    BOLD = "b"
    ITALIC = "i"
    STRONG = "strong"
    EM = "em"
    UNDERLINE = "u"
    MATH = "math"
    MATH_DISPLAY = "math_display"
    REFERENCE = "ref"
    SPAN_REFERENCE = "spanref"
    CONCEPT = "concept"
    A = "a"
    CODE = "code"
    FOOTNOTE = "footnote"


@dataclass
class InnerTag:
    id: str
    tag_name: InnerTagName
    metadata: dict
    position: "Position"
    # These are additional recursive tags within the content of this inner tag.
    # This may happen if we have e.g. <b>[lumi-start-concept]...[lumi-end-concept]</b>
    children: list["InnerTag"]


@dataclass
class LumiReference:
    id: str
    span: LumiSpan


@dataclass
class LumiFootnote:
    id: str
    span: LumiSpan


@dataclass
class LumiAbstract:
    contents: list[LumiContent]


@dataclass
class LumiDoc:
    """Class for LumiDoc, a preprocessed Lumi document representation of a paper."""

    markdown: str

    sections: list[LumiSection]
    concepts: list[LumiConcept]
    abstract: LumiAbstract | None = None
    references: list[LumiReference] | None = None
    footnotes: list[LumiFootnote] | None = None
    summaries: LumiSummaries | None = None
    metadata: ArxivMetadata | None = None
    loading_status: LoadingStatus | None = LoadingStatus.UNSET
    loading_error: str | None = None
