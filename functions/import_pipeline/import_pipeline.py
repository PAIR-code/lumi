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
import os
import tempfile
from typing import Dict, List, Optional

import nltk

nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))
from nltk import tokenize

from import_pipeline import fetch_utils
from import_pipeline import markdown_utils
from import_pipeline import image_utils
from import_pipeline import latex_utils
from models import gemini
from shared import import_tags
from shared.lumi_doc import (
    LumiReference,
    LumiAbstract,
    LumiConcept,
    LumiDoc,
    LumiSection,
    Heading,
    LumiContent,
    TextContent,
    LumiSpan,
    InnerTag,
    InnerTagName,
    ListContent,
    ListItem,
    Position,
    ImageContent,
    HtmlFigureContent,
    FigureContent,
)
from shared.types import ImageMetadata, ArxivMetadata
from shared.utils import get_unique_id

nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))

DEFAULT_TEXT_TAGS = ["p", "code", "pre"]
ORDERED_LIST_TAG = "ol"
UNORDERED_LIST_TAG = "ul"
DEFAULT_LIST_TAGS = [ORDERED_LIST_TAG, UNORDERED_LIST_TAG]
TAGS_TO_PROCESS = DEFAULT_TEXT_TAGS + DEFAULT_LIST_TAGS
STORAGE_PATH_DELIMETER = "__"
PLACEHOLDER_PREFIX = "[[LUMI_PLACEHOLDER_"
PLACEHOLDER_SUFFIX = "]]"


def import_arxiv_latex_and_pdf(
    arxiv_id: str,
    version: str,
    concepts: List[LumiConcept],
    metadata: ArxivMetadata,
    debug=False,
    existing_model_output_file="",
    run_locally: bool = False,
) -> LumiDoc:
    """
    Imports and processes the pdf and latex source with the given identifiers.

    Args:
        arxiv_id (str): The paper id.
        version (int): The paper version.
        concepts (List[LumiConcept]): A list of concepts to identify in the text.
        metadata (ArxivMetadata): The metadata associated with the arxiv paper.
        debug (boolean): If true, writes debug output markdown to local file.
        existing_model_output_file (str): If passed, used in place of generating new model output.
        run_locally (bool): If true, saves files locally instead of cloud.

    Returns:
        LumiDoc: The processed document.
    """
    # Fetch PDF bytes
    if not existing_model_output_file:
        # TODO(ellenj): Investigate why export.arxiv.org endpoint is not working.
        # Making this fetch from arxiv.org for now.
        pdf_data = fetch_utils.fetch_pdf_bytes(
            f"https://arxiv.org/pdf/{arxiv_id}v{version}"
        )

    # Fetch and process LaTeX source
    latex_source_bytes = fetch_utils.fetch_latex_source(arxiv_id, version)

    latex_string = ""
    # Create a temporary directory to extract latex source
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            latex_utils.extract_tar_gz(latex_source_bytes, temp_dir)
            main_tex_file = latex_utils.find_main_tex_file(temp_dir)
            latex_string = latex_utils.inline_tex_files(
                main_tex_file,
                remove_comments=True,
                inline_commands=True,
            )
        except (ValueError, FileNotFoundError) as e:
            raise

        if existing_model_output_file:
            with open(existing_model_output_file, "r") as file:
                model_output = file.read()
        else:
            # Format into markdown with Gemini, using both PDF and LaTeX
            model_output = gemini.format_pdf_with_latex(
                pdf_data=pdf_data, latex_string=latex_string, concepts=concepts
            )

        if debug:
            print("🍭 Debug mode - wrote markdown to: markdown_output.md")
            with open(f"debug/markdown_output_{arxiv_id}v{version}.md", "w+") as file:
                file.write(model_output)

        lumi_doc = convert_model_output_to_lumi_doc(
            model_output_string=model_output,
            concepts=concepts,
            file_id=arxiv_id,
        )

        # Extract images from LaTeX source using info from the parsed LumiDoc
        all_image_contents = _collect_image_contents(lumi_doc)
        # This call updates the width/height on the image contents and writes
        # the images referenced in image contents to the cloud bucket.
        image_utils.extract_images_from_latex_source(
            source_dir=temp_dir,
            image_contents=all_image_contents,
            run_locally=run_locally,
        )

    lumi_doc.metadata = metadata
    return lumi_doc


def _collect_image_contents(doc: LumiDoc) -> List[ImageContent]:
    """Recursively finds and collects all ImageContent objects in a LumiDoc."""
    image_contents = []

    def collect_from_contents(contents: List[LumiContent]):
        for content in contents:
            if content.image_content:
                image_contents.append(content.image_content)
            if content.figure_content:
                image_contents.extend(content.figure_content.images)

    if doc.abstract:
        collect_from_contents(doc.abstract.contents)

    for section in doc.sections:
        collect_from_contents(section.contents)

    return image_contents


def convert_model_output_to_lumi_doc(
    model_output_string: str, concepts: List[LumiConcept], file_id: str
) -> LumiDoc:
    """Converts the model output string to a LumiDoc."""
    # --- Pre-process for figures (tables, algorithms, images) ---
    placeholder_map: Dict[str, LumiContent] = {}
    processed_markdown = preprocess_and_replace_figures(
        model_output_string, file_id, placeholder_map
    )

    parsed_data = markdown_utils.parse_lumi_import(processed_markdown)

    lumi_abstract = None
    if parsed_data.get("abstract"):
        abstract_html = markdown_utils.markdown_to_html(parsed_data.get("abstract"))
        abstract_sections = convert_to_lumi_sections(
            abstract_html, placeholder_map=placeholder_map
        )
        if len(abstract_sections) > 1:
            # TODO(ellenj): Consider raising error
            pass
        if abstract_sections:
            lumi_abstract = LumiAbstract(contents=abstract_sections[0].contents)

    lumi_sections = []
    if parsed_data.get("content"):
        content_html = markdown_utils.markdown_to_html(parsed_data.get("content"))
        lumi_sections = convert_to_lumi_sections(
            content_html, placeholder_map=placeholder_map
        )

    lumi_references = []
    if parsed_data.get("references"):
        for item in parsed_data.get("references"):
            # Parse the reference content for inner tags.
            # Note: References are not split into multiple sentences/spans.
            # The entire reference content is treated as a single span.
            cleaned_text, inner_tags = parse_text_and_extract_inner_tags(
                item["content"]
            )
            lumi_references.append(
                LumiReference(
                    id=item["id"],
                    span=LumiSpan(
                        id=get_unique_id(), text=cleaned_text, inner_tags=inner_tags
                    ),
                )
            )

    return LumiDoc(
        markdown="",
        abstract=lumi_abstract,
        sections=lumi_sections,
        references=lumi_references,
        concepts=concepts,
    )


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


def preprocess_and_replace_figures(
    raw_markdown_string: str, file_id: str, placeholder_map: Dict[str, LumiContent]
) -> str:
    """Finds all figure blocks, replaces them with placeholders, and stores them in a map."""

    def _get_placeholder_id(uid: str):
        return f"{PLACEHOLDER_PREFIX}{uid}{PLACEHOLDER_SUFFIX}"

    def _create_caption_span(caption_text: str) -> Optional[LumiSpan]:
        """Helper to create a LumiSpan for a caption."""
        if not caption_text:
            return None
        cleaned_caption_text, caption_inner_tags = parse_text_and_extract_inner_tags(
            caption_text
        )
        caption_spans = create_lumi_spans(
            cleaned_caption_text, caption_inner_tags, skip_tokenize=True
        )
        return caption_spans[0] if caption_spans else None

    def _create_image_content(image_path: str, caption_text: str):
        caption_span = _create_caption_span(caption_text)

        flattened_filename = image_path.replace("/", STORAGE_PATH_DELIMETER)
        storage_path = f"{file_id}/images/{flattened_filename}"

        return ImageContent(
            latex_path=image_path,
            storage_path=storage_path,
            alt_text="",
            caption=caption_span,
            width=0.0,
            height=0.0,
        )

    def image_replacer(match: re.Match) -> str:
        id = get_unique_id()
        placeholder_id = _get_placeholder_id(id)
        image_path = match.group("image_path")
        caption_text = (match.group("image_caption_text") or "").strip()

        placeholder_map[placeholder_id] = LumiContent(
            id=id, image_content=_create_image_content(image_path, caption_text)
        )
        return placeholder_id

    def figure_replacer(match: re.Match) -> str:
        """Handles [[l-fig-start...]] blocks."""
        id = get_unique_id()
        placeholder_id = _get_placeholder_id(id)

        figure_content_raw = match.group("figure_content")
        main_caption_text = (match.group("main_caption_text") or "").strip()
        main_caption_span = _create_caption_span(main_caption_text)

        # Find all image tags within the figure block
        sub_images: List[ImageContent] = []
        for img_match in import_tags.IMAGE_AND_CAPTION_PATTERN.finditer(
            figure_content_raw
        ):
            image_path = img_match.group("image_path")
            caption_text = (img_match.group("image_caption_text") or "").strip()
            sub_images.append(_create_image_content(image_path, caption_text))

        placeholder_map[placeholder_id] = LumiContent(
            id=id,
            figure_content=FigureContent(images=sub_images, caption=main_caption_span),
        )
        return placeholder_id

    def html_figure_replacer(match: re.Match) -> str:
        id = get_unique_id()
        placeholder_id = _get_placeholder_id(id)
        html_content = match.group("html_content")
        caption_text = (match.group("html_caption_text") or "").strip()
        caption_span = _create_caption_span(caption_text)

        placeholder_map[placeholder_id] = LumiContent(
            id=id,
            html_figure_content=HtmlFigureContent(
                html=html_content.strip(), caption=caption_span
            ),
        )
        return placeholder_id

    # The order here is important. Process complex containers (figures) before simple ones (images).
    processed_html = import_tags.FIGURE_PATTERN.sub(
        figure_replacer, raw_markdown_string
    )
    processed_html = import_tags.HTML_FIGURE_PATTERN.sub(
        html_figure_replacer, processed_html
    )
    processed_html = import_tags.IMAGE_AND_CAPTION_PATTERN.sub(
        image_replacer, processed_html
    )

    return processed_html


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
        sentences = tokenize.sent_tokenize(cleaned_text)

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
