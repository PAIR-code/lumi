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

from llm_models import extract_concepts as extract_concepts_util
from llm_models import llm
from shared import import_tags
from shared.constants import (
    MAX_LATEX_CHARACTER_COUNT,
    PLACEHOLDER_PREFIX,
    PLACEHOLDER_SUFFIX,
)
from shared.lumi_doc import (
    FigureContent,
    HtmlFigureContent,
    ImageContent,
    LumiAbstract,
    LumiConcept,
    LumiContent,
    LumiDoc,
    LumiFootnote,
    LumiReference,
    LumiSection,
    LumiSpan,
)
from shared.types import ArxivMetadata
from shared.utils import get_unique_id

from import_pipeline import (
    convert_html_to_lumi,
    fetch_utils,
    image_utils,
    latex_utils,
    markdown_utils,
)

DEFAULT_TEXT_TAGS = ["p", "code", "pre"]
ORDERED_LIST_TAG = "ol"
UNORDERED_LIST_TAG = "ul"
DEFAULT_LIST_TAGS = [ORDERED_LIST_TAG, UNORDERED_LIST_TAG]
TAGS_TO_PROCESS = DEFAULT_TEXT_TAGS + DEFAULT_LIST_TAGS
STORAGE_PATH_DELIMETER = "__"


def import_arxiv_latex_and_pdf(
    arxiv_id: str,
    version: str,
    concepts: list[LumiConcept],
    metadata: ArxivMetadata,
    debug=False,
    existing_model_output_file="",
    run_locally: bool = False,
) -> tuple[LumiDoc, str]:
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
        Tuple[LumiDoc, str]: The processed document and the first image storage path in the document.
    """
    print(f"📄 [1/5] Starting PDF/LaTeX import for {arxiv_id}v{version}")

    # Fetch PDF bytes
    if not existing_model_output_file:
        print("📥 [1/5] Downloading PDF from ArXiv...")
        # TODO(ellenj): Investigate why export.arxiv.org endpoint is not working.
        # Making this fetch from arxiv.org for now.
        pdf_data = fetch_utils.fetch_pdf_bytes(
            f"https://arxiv.org/pdf/{arxiv_id}v{version}"
        )
        print(f"✅ [1/5] PDF downloaded ({len(pdf_data)} bytes)")

    # Fetch and process LaTeX source
    print("📥 [2/5] Downloading LaTeX source from ArXiv...")
    latex_source_bytes = fetch_utils.fetch_latex_source(arxiv_id, version)

    latex_string = ""
    temp_dir = None

    # Check if LaTeX source is available
    if latex_source_bytes is None:
        print("⚠️  [2/5] No LaTeX source available - will process PDF only")
        # Use PDF-only mode
        temp_context = tempfile.TemporaryDirectory()
        temp_dir = temp_context.__enter__()
    else:
        print(f"✅ [2/5] LaTeX source downloaded ({len(latex_source_bytes)} bytes)")
        temp_context = tempfile.TemporaryDirectory()
        temp_dir = temp_context.__enter__()

    try:
        # Only process LaTeX if available
        if latex_source_bytes is not None:
            try:
                print("📦 [2/5] Extracting LaTeX .tar.gz archive...")
                latex_utils.extract_tar_gz(latex_source_bytes, temp_dir)

                print("🔍 [2/5] Finding main .tex file...")
                main_tex_file = latex_utils.find_main_tex_file(temp_dir)
                print(f"✅ [2/5] Found main file: {main_tex_file}")

                print(
                    "🔗 [2/5] Inlining LaTeX files (combining \\input and \\include)..."
                )
                latex_string = latex_utils.inline_tex_files(
                    main_tex_file,
                    remove_comments=True,
                    inline_commands=False,  # Disabled: can hang on complex papers
                )
                print(f"✅ [2/5] LaTeX processed ({len(latex_string)} characters)")
            except (ValueError, FileNotFoundError) as e:
                print(f"❌ [2/5] Error processing LaTeX: {e}")
                raise

            if len(latex_string) > MAX_LATEX_CHARACTER_COUNT:
                print(
                    f"❌ [2/5] Document too long: {len(latex_string)} > {MAX_LATEX_CHARACTER_COUNT}"
                )
                raise ValueError("Document is too long")

        if existing_model_output_file:
            print("📂 [3/5] Loading existing model output from file...")
            with open(existing_model_output_file) as file:
                model_output = file.read()
        else:
            # Format into markdown with GPT-4.1, using both PDF and LaTeX
            print("🤖 [3/5] Calling GPT-4.1 to format PDF+LaTeX into Markdown...")
            print("    ⏳ This takes 60-120 seconds - please be patient!")
            print(
                f"    📊 Processing {len(latex_string)} chars of LaTeX + {len(pdf_data)} bytes of PDF"
            )
            model_output = llm.format_pdf_with_latex(
                pdf_data=pdf_data,
                latex_string=latex_string,
                concepts=concepts,
                arxiv_id=arxiv_id,
                version=version,
            )
            print(
                f"✅ [3/5] GPT-4.1 formatting complete! Generated {len(model_output)} chars of markdown"
            )

        if debug:
            model_output_path = f"debug/markdown_output_{arxiv_id}v{version}.md"
            print(f"🍭 Debug mode - wrote markdown to: {model_output_path}")
            with open(model_output_path, "w+") as file:
                file.write(model_output)

        print("📝 [4/5] Converting markdown to LumiDoc structure...")
        lumi_doc = convert_model_output_to_lumi_doc(
            model_output_string=model_output,
            concepts=concepts,
            file_id=arxiv_id,
        )
        lumi_doc.metadata = metadata
        print(f"✅ [4/5] LumiDoc created with {len(lumi_doc.sections)} sections")

        # Extract images from LaTeX source using info from the parsed LumiDoc
        print("🖼️  [5/5] Extracting images from LaTeX source...")
        all_image_contents = _collect_image_contents(lumi_doc)
        print(f"    Found {len(all_image_contents)} images to process")

        # This call updates the width/height on the image contents and writes
        # the images referenced in image contents to the cloud bucket.
        images = image_utils.extract_images_from_latex_source(
            source_dir=temp_dir,
            image_contents=all_image_contents,
            run_locally=run_locally,
        )
        print(f"✅ [5/5] Processed {len(images)} images")

        image_path = ""
        if len(images) > 0:
            image_path = images[0].storage_path

        print(f"🎉 PDF/LaTeX import complete for {arxiv_id}v{version}!")
        return lumi_doc, image_path
    finally:
        # Clean up temp directory
        if temp_context:
            temp_context.__exit__(None, None, None)


def _collect_image_contents(doc: LumiDoc) -> list[ImageContent]:
    """Recursively finds and collects all ImageContent objects in a LumiDoc."""
    image_contents = []

    def collect_from_contents(contents: list[LumiContent]):
        for content in contents:
            if content.image_content:
                image_contents.append(content.image_content)
            if content.figure_content:
                image_contents.extend(content.figure_content.images)

    def collect_from_sections(sections: list[LumiSection]):
        for section in sections:
            collect_from_contents(section.contents)
            if section.sub_sections:
                collect_from_sections(section.sub_sections)

    if doc.abstract:
        collect_from_contents(doc.abstract.contents)

    collect_from_sections(doc.sections)
    return image_contents


def convert_model_output_to_lumi_doc(
    model_output_string: str, concepts: list[LumiConcept], file_id: str
) -> LumiDoc:
    """Converts the model output string to a LumiDoc."""
    # --- Pre-process for figures (tables, algorithms, images) ---
    placeholder_map: dict[str, LumiContent] = {}
    processed_markdown = preprocess_and_replace_figures(
        model_output_string, file_id, placeholder_map
    )

    parsed_data = markdown_utils.parse_lumi_import(processed_markdown)

    lumi_abstract = None
    if parsed_data.get("abstract"):
        # Extract equations before markdown conversion
        abstract_markdown, equation_map = (
            markdown_utils.extract_equations_to_placeholders(
                parsed_data.get("abstract")
            )
        )
        abstract_html = markdown_utils.markdown_to_html(abstract_markdown)
        from typing import cast

        from shared.lumi_doc import LumiContent

        # Type cast: equation_map is dict[str, str] but placeholder_map expects dict[str, LumiContent]
        # In practice, the function handles both types
        combined_placeholder_map = {
            **placeholder_map,
            **cast(dict[str, LumiContent], equation_map),
        }

        abstract_sections = convert_html_to_lumi.convert_to_lumi_sections(
            abstract_html, placeholder_map=combined_placeholder_map
        )
        if len(abstract_sections) > 1:
            # TODO(ellenj): Consider raising error
            pass
        if abstract_sections:
            abstract_section = abstract_sections[0]
            # Annotate abstract with concepts
            for content in abstract_section.contents:
                if content.text_content:
                    extract_concepts_util.annotate_concepts_in_place(
                        content.text_content.spans, concepts
                    )
            lumi_abstract = LumiAbstract(contents=abstract_section.contents)

    lumi_sections = []
    if parsed_data.get("content"):
        # Extract equations before markdown conversion
        content_markdown, equation_map = (
            markdown_utils.extract_equations_to_placeholders(parsed_data.get("content"))
        )
        content_html = markdown_utils.markdown_to_html(content_markdown)
        from typing import cast

        from shared.lumi_doc import LumiContent

        # Type cast: equation_map is dict[str, str] but placeholder_map expects dict[str, LumiContent]
        # In practice, the function handles both types
        combined_placeholder_map = {
            **placeholder_map,
            **cast(dict[str, LumiContent], equation_map),
        }

        lumi_sections = convert_html_to_lumi.convert_to_lumi_sections(
            content_html, placeholder_map=combined_placeholder_map
        )

    lumi_references = []
    if parsed_data.get("references"):
        for item in parsed_data.get("references"):
            # Parse the reference content for inner tags.
            # Note: References are not split into multiple sentences/spans.
            # The entire reference content is treated as a single span.
            spans = convert_html_to_lumi.convert_raw_output_to_spans(
                item["content"], skip_tokenize=True
            )
            if spans:
                lumi_references.append(
                    LumiReference(
                        id=item["id"],
                        span=spans[0],
                    )
                )

    lumi_footnotes = []
    if parsed_data.get("footnotes"):
        for item in parsed_data.get("footnotes"):
            spans = convert_html_to_lumi.convert_raw_output_to_spans(
                item["content"], skip_tokenize=True
            )
            if spans:
                lumi_footnotes.append(
                    LumiFootnote(
                        id=item["id"],
                        span=spans[0],
                    )
                )

    return LumiDoc(
        markdown="",
        abstract=lumi_abstract,
        sections=lumi_sections,
        references=lumi_references,
        footnotes=lumi_footnotes,
        concepts=concepts,
    )


def preprocess_and_replace_figures(
    raw_markdown_string: str, file_id: str, placeholder_map: dict[str, LumiContent]
) -> str:
    """Finds all figure blocks, replaces them with placeholders, and stores them in a map."""

    def _get_placeholder_id(uid: str) -> str:
        return f"{PLACEHOLDER_PREFIX}{uid}{PLACEHOLDER_SUFFIX}"

    def _create_caption_span(caption_text: str) -> LumiSpan | None:
        """Helper to create a LumiSpan for a caption."""
        if not caption_text:
            return None
        caption_spans = convert_html_to_lumi.convert_raw_output_to_spans(
            caption_text, skip_tokenize=True
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
        sub_images: list[ImageContent] = []
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
                html=markdown_utils.postprocess_content_text(html_content.strip()),
                caption=caption_span,
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
