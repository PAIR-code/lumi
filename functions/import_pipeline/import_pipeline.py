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
import tempfile
from typing import Dict, List, Optional
from import_pipeline import fetch_utils
from import_pipeline import markdown_utils
from import_pipeline import image_utils
from import_pipeline import latex_utils
from import_pipeline import convert_html_to_lumi
from models import gemini
from shared import import_tags
from shared.lumi_doc import (
    LumiReference,
    LumiAbstract,
    LumiConcept,
    LumiDoc,
    LumiContent,
    LumiSpan,
    ImageContent,
    HtmlFigureContent,
    FigureContent,
)
from shared.types import ArxivMetadata
from shared.utils import get_unique_id

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
        abstract_sections = convert_html_to_lumi.convert_to_lumi_sections(
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
        lumi_sections = convert_html_to_lumi.convert_to_lumi_sections(
            content_html, placeholder_map=placeholder_map
        )

    lumi_references = []
    if parsed_data.get("references"):
        for item in parsed_data.get("references"):
            # Parse the reference content for inner tags.
            # Note: References are not split into multiple sentences/spans.
            # The entire reference content is treated as a single span.
            cleaned_text, inner_tags = (
                convert_html_to_lumi.parse_text_and_extract_inner_tags(item["content"])
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
        cleaned_caption_text, caption_inner_tags = (
            convert_html_to_lumi.parse_text_and_extract_inner_tags(caption_text)
        )
        caption_spans = convert_html_to_lumi.create_lumi_spans(
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
