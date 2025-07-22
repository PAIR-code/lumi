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


import bs4
import re
from typing import Dict, List, Optional

from shared import import_tags
from shared.lumi_doc import (
    LumiSection,
    Heading,
    LumiContent,
    TextContent,
    LumiSpan,
    InnerTag,
    ListContent,
    ListItem,
    Position,
)
from shared.utils import get_unique_id
from import_pipeline.tokenize import tokenize_sentences

DEFAULT_TEXT_TAGS = ["p", "code", "pre"]
ORDERED_LIST_TAG = "ol"
UNORDERED_LIST_TAG = "ul"
DEFAULT_LIST_TAGS = [ORDERED_LIST_TAG, UNORDERED_LIST_TAG]
TAGS_TO_PROCESS = DEFAULT_TEXT_TAGS + DEFAULT_LIST_TAGS
STORAGE_PATH_DELIMETER = "__"
PLACEHOLDER_PREFIX = "[[LUMI_PLACEHOLDER_"
PLACEHOLDER_SUFFIX = "]]"


def convert_to_lumi_sections(
    html: str, placeholder_map: Dict[str, LumiContent]
) -> List[LumiSection]:
    """
    Converts an HTML string into a hierarchical list of LumiSection objects.

    This function parses an HTML string and builds a tree of sections based on
    heading tags (<h1>, <h2>, etc.). It uses a stack-based approach to manage
    the current nesting level. Content tags (like <p>, <ul>) are appended to the
    `contents` of the current section at the top of the stack.

    Args:
        html: The input HTML string to parse.
        placeholder_map: A dictionary mapping placeholder strings to pre-parsed
                         LumiContent objects (e.g., for images or tables).

    Returns:
        A list of top-level LumiSection objects. Each section may contain
        nested sub-sections.
    """
    soup = bs4.BeautifulSoup(html, "html.parser")

    # root_sections holds the list of top-level sections (e.g., H1s) to be returned.
    root_sections: List[LumiSection] = []

    # section_stack keeps track of the current hierarchy of sections. The last
    # element is the current section being populated.
    section_stack: List[LumiSection] = []

    visited_tags = set()

    for tag in soup.recursiveChildGenerator():
        # Check if the tag is a heading (h1, h2, etc.)
        if tag.name and tag.name.startswith("h") and tag.name[1:].isdigit():
            heading_level = int(tag.name[1:])
            heading_text = "".join(tag.find_all(text=True, recursive=False))

            new_section = LumiSection(
                id=get_unique_id(),
                heading=Heading(heading_level=heading_level, text=heading_text),
                contents=[],
                sub_sections=[],
            )

            # Adjust the stack to find the correct parent for the new section.
            # Pop sections from the stack until the top section is a valid parent
            # (i.e., its heading level is less than the new section's).
            while (
                section_stack
                and section_stack[-1].heading.heading_level >= heading_level
            ):
                section_stack.pop()

            if section_stack:
                # If the stack is not empty, the new section is a sub-section.
                parent_section = section_stack[-1]
                if parent_section.sub_sections is None:
                    parent_section.sub_sections = []
                parent_section.sub_sections.append(new_section)
            else:
                # If the stack is empty, it's a new top-level section.
                root_sections.append(new_section)

            # Push the new section onto the stack, making it the current section.
            section_stack.append(new_section)

        # Process content tags (p, ul, ol, etc.)
        elif tag not in visited_tags and tag.name in TAGS_TO_PROCESS:
            if not section_stack:
                # If content appears before any heading, create a default section to hold it.
                # This section has a heading level of 0.
                default_section = LumiSection(
                    id=get_unique_id(),
                    heading=Heading(heading_level=0, text=""),
                    contents=[],
                    sub_sections=[],
                )
                section_stack.append(default_section)
                root_sections.append(default_section)

            # Add content to the current section (the one at the top of the stack).
            current_section = section_stack[-1]
            if tag.name in DEFAULT_TEXT_TAGS:
                new_contents: List[LumiContent] = _parse_html_block_for_lumi_contents(
                    tag.decode_contents(), tag.name, placeholder_map
                )
                if new_contents:
                    current_section.contents.extend(new_contents)
            else:
                # For now, we assume list content will not contain images or figures.
                new_content = _get_list_content_from_tag(tag)
                if new_content:
                    current_section.contents.append(new_content)

            # Mark the tag and its descendants as visited to avoid processing them again.
            visited_tags.add(tag)
            if hasattr(tag, "descendants"):
                for descendant in tag.descendants:
                    visited_tags.add(descendant)

    return root_sections


def _parse_html_block_for_lumi_contents(
    text: str,
    original_tag_name: str,
    placeholder_map: Dict[str, LumiContent],
):
    """
    Parses a raw HTML string (e.g., from tag.decode_contents()) into a sequence of LumiContent objects,
    correctly handling interleaving TextContent / HTMLFigureContent / ImageContent by swapping out placeholders.
    """
    if not text.strip():
        return

    lumi_contents: List[LumiContent] = []

    # Regex to find placeholders within the text segment
    placeholder_pattern = re.compile(
        f"({re.escape(PLACEHOLDER_PREFIX)}.*?{re.escape(PLACEHOLDER_SUFFIX)})"
    )

    current_pos = 0
    for match in placeholder_pattern.finditer(text):
        # Add text before the placeholder
        if match.start() > current_pos:
            pre_text = text[current_pos : match.start()]
            if pre_text.strip():
                cleaned_text, inner_tags = parse_text_and_extract_inner_tags(pre_text)
                spans = create_lumi_spans(cleaned_text, inner_tags)
                if spans:
                    lumi_contents.append(
                        LumiContent(
                            id=get_unique_id(),
                            text_content=TextContent(
                                tag_name=original_tag_name, spans=spans
                            ),
                        )
                    )

        # Add the placeholder content
        placeholder_id = match.group(1)
        if placeholder_id in placeholder_map:
            lumi_contents.append(placeholder_map[placeholder_id])

        current_pos = match.end()

    # Add any remaining text after the last placeholder
    if current_pos < len(text):
        post_text = text[current_pos:]
        if post_text.strip():
            cleaned_text, inner_tags = parse_text_and_extract_inner_tags(post_text)
            spans = create_lumi_spans(cleaned_text, inner_tags)
            if spans:
                lumi_contents.append(
                    LumiContent(
                        id=get_unique_id(),
                        text_content=TextContent(
                            tag_name=original_tag_name, spans=spans
                        ),
                    )
                )

    return lumi_contents


def _get_list_content_from_tag(tag: bs4.Tag) -> Optional[LumiContent]:
    """
    Returns a LumiContent object for list tags (ul, ol).
    Note: This function does not currently handle images embedded within list items.
    """

    if tag.name in DEFAULT_LIST_TAGS:
        list_items_processed = []
        # Iterate over all direct list children
        for li_tag in tag.find_all("li", recursive=False):
            # This contains all unparsed tags like <b> or [l-conc-id-N]
            raw_li_content_html = ""
            subListContent: ListContent | None = None

            for child_node in li_tag.contents:
                # If the child node is a list, process it as a nested sublist.
                # (There can only be one nested sublist per list item.)
                if child_node.name in DEFAULT_LIST_TAGS and subListContent is None:
                    nested_lumi_content_obj = _get_list_content_from_tag(child_node)
                    if nested_lumi_content_obj and nested_lumi_content_obj.list_content:
                        subListContent = nested_lumi_content_obj.list_content
                else:
                    # Otherwise, we add the child node to the raw html content.
                    raw_li_content_html += str(child_node.get_text())

            cleaned_li_text, li_inner_tags = parse_text_and_extract_inner_tags(
                raw_li_content_html
            )

            current_li_spans = []
            if cleaned_li_text.strip() or li_inner_tags:
                # Create the new LumiSpans from the processed text (with tags removed etc)
                # and parsed inner tags.
                current_li_spans = create_lumi_spans(cleaned_li_text, li_inner_tags)

            list_items_processed.append(
                ListItem(spans=current_li_spans, subListContent=subListContent)
            )

        return LumiContent(
            id=get_unique_id(),
            list_content=ListContent(
                is_ordered=(tag.name == ORDERED_LIST_TAG),
                list_items=list_items_processed,
            ),
        )
    else:
        return None


def parse_text_and_extract_inner_tags(raw_content: str) -> (str, List[InnerTag]):
    """
    Parses raw HTML-like content to extract plain text and InnerTag objects.
    This function is recursive to handle nested tags. The content of tags is
    also parsed, and any inner tags found are added as children to the parent tag.
    """
    cleaned_text_content = ""
    inner_tags = []
    current_position_raw = 0
    current_position_cleaned = 0

    while current_position_raw < len(raw_content):
        earliest_match = None
        earliest_match_tag_definition = None

        # Find the earliest next tag from current_position_raw
        for tag_definition in import_tags.TAG_DEFINITIONS:
            match = tag_definition["pattern"].search(raw_content, current_position_raw)
            if match:
                if earliest_match is None or match.start() < earliest_match.start():
                    earliest_match = match
                    earliest_match_tag_definition = tag_definition

        if earliest_match:
            # Append plain text between current_position_raw and the found tag
            text_before_match = raw_content[
                current_position_raw : earliest_match.start()
            ]
            if text_before_match:
                cleaned_text_content += text_before_match
                current_position_cleaned += len(text_before_match)

            tag_start_index = current_position_cleaned

            # For tags with no content, the group may not exist.
            tag_inner_content_raw = ""
            if "content" in earliest_match.groupdict():
                tag_inner_content_raw = earliest_match.group("content")

            # Recursively parse the content of the tag
            (
                tag_inner_content_cleaned,
                child_tags,
            ) = parse_text_and_extract_inner_tags(tag_inner_content_raw)

            cleaned_text_content += tag_inner_content_cleaned
            current_position_cleaned += len(tag_inner_content_cleaned)
            tag_end_index = current_position_cleaned

            metadata = earliest_match_tag_definition["metadata_extractor"](
                earliest_match
            )

            inner_tags.append(
                InnerTag(
                    tag_name=earliest_match_tag_definition["name"],
                    metadata=metadata,
                    position=Position(
                        start_index=tag_start_index, end_index=tag_end_index
                    ),
                    children=child_tags,
                )
            )

            current_position_raw = earliest_match.end()
        else:
            # No tags remaining, append the remaining plain text
            remaining_plain_text = raw_content[current_position_raw:]
            if remaining_plain_text:
                cleaned_text_content += remaining_plain_text
            break

    return cleaned_text_content, inner_tags


def create_lumi_spans(
    cleaned_text: str, all_inner_tags: List[InnerTag], skip_tokenize=False
) -> List[LumiSpan]:
    """
    Splits cleaned_text into sentences and creates LumiSpan objects.
    InnerTag objects (with positions relative to cleaned_text) are distributed
    to their respective sentences, adjusting positions to be sentence-relative.
    If an InnerTag overlaps with multiple sentence, an inner tag is added to both
    other sentences with the positions clamped accordingly.
    """
    lumi_spans: List[LumiSpan] = []

    if not cleaned_text.strip() and not all_inner_tags:
        return []

    sentences = []
    if not skip_tokenize:
        sentences = tokenize_sentences(cleaned_text, all_inner_tags)

    if not sentences or skip_tokenize:
        # If tokenization results in no sentences, but there is text or tags,
        # treat the whole text as a single sentence/span. This can happen for
        # reference entries that don't have standard sentence punctuation.
        if cleaned_text or all_inner_tags:
            lumi_spans.append(
                LumiSpan(
                    id=get_unique_id(),
                    text=cleaned_text,
                    inner_tags=all_inner_tags,
                )
            )
        return lumi_spans

    cleaned_text_search_offset = 0
    for sentence_text in sentences:
        # Locate the first index of sentence_text within cleaned_text (after the offset)
        sentence_start_in_cleaned = cleaned_text.find(
            sentence_text, cleaned_text_search_offset
        )
        if sentence_start_in_cleaned == -1:
            # Should not happen if sentences are derived from cleaned_text
            continue
        sentence_end_in_cleaned = sentence_start_in_cleaned + len(sentence_text)

        tags_relative_to_sentence: List[InnerTag] = []
        for inner_tag in all_inner_tags:
            tag_start_absolute = inner_tag.position.start_index
            tag_end_absolute = inner_tag.position.end_index

            if (
                tag_start_absolute <= sentence_end_in_cleaned
                and tag_end_absolute >= sentence_start_in_cleaned
            ):
                tag_start_relative = max(
                    0, tag_start_absolute - sentence_start_in_cleaned
                )
                tag_end_relative = min(
                    len(sentence_text),
                    tag_end_absolute - sentence_start_in_cleaned,
                )

                # For zero-length tags, tag_end_relative can be equal to len(sentence_text)
                # if the tag is at the very end.
                if tag_start_relative <= tag_end_relative and tag_end_relative <= len(
                    sentence_text
                ):
                    tags_relative_to_sentence.append(
                        InnerTag(
                            tag_name=inner_tag.tag_name,
                            metadata=inner_tag.metadata.copy(),
                            position=Position(
                                start_index=tag_start_relative,
                                end_index=tag_end_relative,
                            ),
                            # Children are preserved as they are not position-dependent
                            children=inner_tag.children,
                        )
                    )

        lumi_spans.append(
            LumiSpan(
                id=get_unique_id(),
                text=sentence_text,
                inner_tags=tags_relative_to_sentence,
            )
        )
        cleaned_text_search_offset = sentence_end_in_cleaned

    return lumi_spans
