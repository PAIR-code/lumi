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

import re

import bs4
from shared.constants import (
    PLACEHOLDER_PREFIX,
    PLACEHOLDER_SUFFIX,
)
from shared.lumi_doc import (
    Heading,
    LumiContent,
    LumiSection,
    LumiSpan,
    TextContent,
)
from shared.utils import get_unique_id

from import_pipeline.convert_list_content import (
    DEFAULT_LIST_TAGS,
    get_list_content_from_tag,
)
from import_pipeline.convert_lumi_spans import (
    create_lumi_spans,
    parse_text_and_extract_inner_tags,
)
from import_pipeline.import_utils import get_text
from import_pipeline.markdown_utils import (
    markdown_to_html,
    substitute_equation_placeholders,
)

DEFAULT_TEXT_TAGS = ["p", "code", "pre"]
TAGS_TO_PROCESS = DEFAULT_TEXT_TAGS + DEFAULT_LIST_TAGS
STORAGE_PATH_DELIMETER = "__"


def convert_to_lumi_sections(
    html: str, placeholder_map: dict[str, LumiContent], strip_double_brackets=False
) -> list[LumiSection]:
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
    root_sections: list[LumiSection] = []

    # section_stack keeps track of the current hierarchy of sections. The last
    # element is the current section being populated.
    section_stack: list[LumiSection] = []

    visited_tags = set()

    for tag in soup.recursiveChildGenerator():
        # Check if the tag is a heading (h1, h2, etc.)
        if tag.name and tag.name.startswith("h") and tag.name[1:].isdigit():
            heading_level = int(tag.name[1:])
            heading_text = get_text(tag)

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
                # This section has a heading level of 1.
                default_section = LumiSection(
                    id=get_unique_id(),
                    heading=Heading(heading_level=1, text=""),
                    contents=[],
                    sub_sections=[],
                )
                section_stack.append(default_section)
                root_sections.append(default_section)

            # Add content to the current section (the one at the top of the stack).
            current_section = section_stack[-1]
            if tag.name in DEFAULT_TEXT_TAGS:
                new_contents: list[LumiContent] = _parse_html_block_for_lumi_contents(
                    get_text(tag),
                    tag.name,
                    placeholder_map,
                    strip_double_brackets=strip_double_brackets,
                )
                if new_contents:
                    current_section.contents.extend(new_contents)
            else:
                # For now, we assume list content will not contain images or figures.
                new_content = get_list_content_from_tag(
                    tag,
                    placeholder_map=placeholder_map,
                    strip_double_brackets=strip_double_brackets,
                )
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
    placeholder_map: dict[str, LumiContent],
    strip_double_brackets=False,
):
    """
    Parses a raw HTML string (e.g., from tag.decode_contents()) into a sequence of LumiContent objects,
    correctly handling interleaving TextContent / HTMLFigureContent / ImageContent by swapping out placeholders.
    """
    if not text.strip():
        return

    text = substitute_equation_placeholders(text, placeholder_map)

    lumi_contents: list[LumiContent] = []

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
                spans = create_lumi_spans(
                    cleaned_text,
                    inner_tags,
                    strip_double_brackets=strip_double_brackets,
                )
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
            spans = create_lumi_spans(
                cleaned_text, inner_tags, strip_double_brackets=strip_double_brackets
            )
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


def convert_raw_output_to_spans(
    output_text: str, skip_tokenize=False, strip_double_brackets=False
) -> list[LumiSpan]:
    html = markdown_to_html(output_text)
    soup = bs4.BeautifulSoup(html, "html.parser")

    children = list(soup.children)
    if not children:
        return []

    text = get_text(children[0])

    cleaned_text, inner_tags = parse_text_and_extract_inner_tags(text)
    return create_lumi_spans(
        cleaned_text,
        inner_tags,
        skip_tokenize=skip_tokenize,
        strip_double_brackets=strip_double_brackets,
    )
