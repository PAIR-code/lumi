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


import unittest
from dataclasses import asdict
from unittest.mock import patch

from llm_models import extract_concepts
from shared import import_tags
from shared.lumi_doc import (
    FigureContent,
    Heading,
    ImageContent,
    InnerTag,
    InnerTagName,
    LumiAbstract,
    LumiConcept,
    LumiContent,
    LumiDoc,
    LumiFootnote,
    LumiReference,
    LumiSection,
    LumiSpan,
    Position,
    TextContent,
)
from shared.types import ArxivMetadata

from import_pipeline import convert_html_to_lumi, convert_lumi_spans, import_pipeline


class PreprocessAndReplaceFiguresTest(unittest.TestCase):
    @patch.object(convert_lumi_spans, "get_unique_id", return_value="123")
    @patch.object(convert_html_to_lumi, "get_unique_id")
    @patch.object(import_pipeline, "get_unique_id")
    def test_interleaved_image_and_html_figure(
        self,
        mock_get_unique_id,
        mock_convert_html_get_unique_id,
        mock_convert_lumi_spans_get_unique_id,
    ):
        del mock_convert_html_get_unique_id  # unused

        self.maxDiff = None
        markdown_input = rf"Some text {import_tags.L_IMG_START_PREFIX}fig1.png{import_tags.L_IMG_END} and more text {import_tags.L_HTML_START_PREFIX}T1{import_tags.L_HTML_END}<div>\$[[l-ref]]</div>{import_tags.L_HTML_START_PREFIX}T1{import_tags.L_HTML_END}{import_tags.L_HTML_CAP_START_PREFIX}T1{import_tags.L_HTML_CAP_END}Cap{import_tags.L_HTML_CAP_START_PREFIX}T1{import_tags.L_HTML_CAP_END}"
        placeholder_map = {}

        # The mock needs to provide enough unique IDs for all calls within preprocess_and_replace_figures.
        # In this case: 1 for the HTML figure, 1 for its caption, and 1 for the image.
        mock_get_unique_id.side_effect = ["html_id_1", "image_id_1"]
        mock_convert_lumi_spans_get_unique_id.side_effect = ["caption_id_1"]

        processed_markdown = import_pipeline.preprocess_and_replace_figures(
            markdown_input, "file_id", placeholder_map
        )

        # Check the processed HTML string
        expected_markdown = "Some text [[LUMI_PLACEHOLDER_image_id_1]] and more text [[LUMI_PLACEHOLDER_html_id_1]]"
        self.assertEqual(expected_markdown, processed_markdown)

        # Check the placeholder map
        self.assertEqual(len(placeholder_map), 2)

        html_placeholder_id = "[[LUMI_PLACEHOLDER_html_id_1]]"
        image_placeholder_id = "[[LUMI_PLACEHOLDER_image_id_1]]"

        self.assertIn(html_placeholder_id, placeholder_map)
        self.assertIn(image_placeholder_id, placeholder_map)

        # Validate HtmlFigureContent
        html_content = placeholder_map[html_placeholder_id].html_figure_content
        self.assertIsNotNone(html_content)
        self.assertEqual(html_content.html, "<div>$</div>")
        self.assertIsNotNone(html_content.caption)
        self.assertEqual(html_content.caption.text, "Cap")
        self.assertEqual(html_content.caption.id, "caption_id_1")

        # Validate ImageContent
        image_content = placeholder_map[image_placeholder_id].image_content
        self.assertIsNotNone(image_content)
        self.assertEqual(image_content.latex_path, "fig1.png")
        self.assertIsNone(image_content.caption)

    @patch.object(import_pipeline, "get_unique_id")
    def test_figure_with_subfigures(self, mock_get_unique_id):
        self.maxDiff = None
        mock_get_unique_id.return_value = "uid"
        markdown_input = f"""
        {import_tags.L_FIG_START_PREFIX}FIG1{import_tags.L_FIG_END}
            {import_tags.L_IMG_START_PREFIX}sub1.png{import_tags.L_IMG_END}
                {import_tags.L_IMG_CAP_START_PREFIX}sub1.png{import_tags.L_IMG_CAP_END}
                    Sub 1 Cap
                {import_tags.L_IMG_CAP_START_PREFIX}sub1.png{import_tags.L_IMG_CAP_END}
            {import_tags.L_IMG_START_PREFIX}sub2.png{import_tags.L_IMG_END}
        {import_tags.L_FIG_END_PREFIX}FIG1{import_tags.L_FIG_END}
        {import_tags.L_FIG_CAP_START_PREFIX}FIG1{import_tags.L_FIG_CAP_END}
            Main Cap
        {import_tags.L_FIG_CAP_START_PREFIX}FIG1{import_tags.L_FIG_CAP_END}
        """

        placeholder_map = {}
        processed_markdown = import_pipeline.preprocess_and_replace_figures(
            markdown_input, "file_id", placeholder_map
        )

        expected_placeholder_id = "[[LUMI_PLACEHOLDER_uid]]"
        self.assertEqual(processed_markdown.strip(), expected_placeholder_id)
        self.assertIn(expected_placeholder_id, placeholder_map)

        lumi_content = placeholder_map[expected_placeholder_id]
        self.assertIsNotNone(lumi_content.figure_content)

        figure_content = lumi_content.figure_content
        self.assertEqual(figure_content.caption.text, "Main Cap")
        self.assertEqual(len(figure_content.images), 2)

        # Check first sub-image
        self.assertEqual(figure_content.images[0].latex_path, "sub1.png")
        self.assertEqual(figure_content.images[0].caption.text, "Sub 1 Cap")

        # Check second sub-image (no caption)
        self.assertEqual(figure_content.images[1].latex_path, "sub2.png")
        self.assertIsNone(figure_content.images[1].caption)


class ImportPipelineTest(unittest.TestCase):
    @patch.object(convert_lumi_spans, "get_unique_id", return_value="123")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="123")
    @patch.object(extract_concepts, "get_unique_id", return_value="123")
    @patch("import_pipeline.markdown_utils.parse_lumi_import")
    def test_convert_model_output_to_lumi_doc_with_abstract(
        self,
        mock_parse_lumi_import,
        mock_get_unique_id_extract_concepts,
        mock_get_unique_id_convert_html_to_lumi,
        mock_get_unique_id_convert_lumi_spans,
    ):
        """Tests that concept inner tags in abstract are correctly parsed."""
        self.maxDiff = None
        del mock_get_unique_id_extract_concepts  # unused
        del mock_get_unique_id_convert_html_to_lumi  # unused
        del mock_get_unique_id_convert_lumi_spans  # unused

        # Mock the output of the markdown parser
        mock_parse_lumi_import.return_value = {
            "abstract": "Here's an abstract with a concept",
            "content": "",
            "references": [],
            "footnotes": "",
        }

        concepts = [
            LumiConcept(id="123", name="concept", contents=[], in_text_citations=[])
        ]

        expected_abstract = LumiAbstract(
            contents=[
                LumiContent(
                    id="123",
                    text_content=TextContent(
                        tag_name="p",
                        spans=[
                            LumiSpan(
                                id="123",
                                text="Here's an abstract with a concept",
                                inner_tags=[
                                    InnerTag(
                                        id="123",
                                        tag_name=InnerTagName.CONCEPT,
                                        metadata={"concept_id": "123"},
                                        children=[],
                                        position=Position(start_index=26, end_index=33),
                                    )
                                ],
                            )
                        ],
                    ),
                )
            ]
        )

        # Call the function to be tested
        lumi_doc = import_pipeline.convert_model_output_to_lumi_doc(
            # This string doesn't matter since parse_lumi_import is mocked
            model_output_string="dummy_string",
            concepts=concepts,
            file_id="test_file",
        )

        self.assertEqual(asdict(expected_abstract), asdict(lumi_doc.abstract))

    @patch.object(convert_lumi_spans, "get_unique_id", return_value="123")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="123")
    @patch("import_pipeline.markdown_utils.parse_lumi_import")
    def test_convert_model_output_to_lumi_doc_with_references(
        self,
        mock_parse_lumi_import,
        mock_get_unique_id_convert_html_to_lumi,
        mock_get_unique_id_convert_lumi_spans,
    ):
        """Tests that inner tags in references are correctly parsed."""
        del mock_get_unique_id_convert_html_to_lumi  # unused
        del mock_get_unique_id_convert_lumi_spans  # unused

        self.maxDiff = None

        # Mock the output of the markdown parser
        mock_parse_lumi_import.return_value = {
            "abstract": "",
            "content": "",
            "references": [
                {"id": "ref1", "content": "This is a <b>bold</b> reference."},
                {"id": "ref2", "content": "This is an *italic* one."},
            ],
            "footnotes": "",
        }

        expected_references = [
            LumiReference(
                id="ref1",
                span=LumiSpan(
                    id="123",
                    text="This is a bold reference.",
                    inner_tags=[
                        InnerTag(
                            id="123",
                            tag_name=InnerTagName.BOLD,
                            metadata={},
                            position=Position(start_index=10, end_index=14),
                            children=[],
                        )
                    ],
                ),
            ),
            LumiReference(
                id="ref2",
                span=LumiSpan(
                    id="123",
                    text="This is an italic one.",
                    inner_tags=[
                        InnerTag(
                            id="123",
                            tag_name=InnerTagName.EM,
                            metadata={},
                            position=Position(start_index=11, end_index=17),
                            children=[],
                        )
                    ],
                ),
            ),
        ]

        # Call the function to be tested
        lumi_doc = import_pipeline.convert_model_output_to_lumi_doc(
            # This string doesn't matter since parse_lumi_import is mocked
            model_output_string="dummy_string",
            concepts=[],
            file_id="test_file",
        )

        # Assert that the references in the LumiDoc are what we expect
        self.assertEqual(len(expected_references), len(lumi_doc.references))
        for i in range(len(expected_references)):
            self.assertEqual(
                asdict(expected_references[i]), asdict(lumi_doc.references[i])
            )

    @patch.object(convert_lumi_spans, "get_unique_id", return_value="123")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="123")
    @patch("import_pipeline.markdown_utils.parse_lumi_import")
    def test_convert_model_output_to_lumi_doc_with_footnotes(
        self,
        mock_parse_lumi_import,
        mock_get_unique_id_html_to_lumi,
        mock_get_unique_id_lumi_spans,
    ):
        """Tests that footnotes are correctly parsed."""
        self.maxDiff = None
        del mock_get_unique_id_html_to_lumi  # unused
        del mock_get_unique_id_lumi_spans  # unused

        # Mock the output of the markdown parser
        mock_parse_lumi_import.return_value = {
            "abstract": "",
            "content": "",
            "references": [],
            "footnotes": [
                {"id": "1", "content": "Footnote 1 text."},
                {"id": "2", "content": "Footnote <b>2</b> text."},
            ],
        }

        expected_footnotes = [
            LumiFootnote(
                id="1",
                span=LumiSpan(
                    id="123",
                    text="Footnote 1 text.",
                    inner_tags=[],
                ),
            ),
            LumiFootnote(
                id="2",
                span=LumiSpan(
                    id="123",
                    text="Footnote 2 text.",
                    inner_tags=[
                        InnerTag(
                            id="123",
                            tag_name=InnerTagName.BOLD,
                            metadata={},
                            position=Position(start_index=9, end_index=10),
                            children=[],
                        )
                    ],
                ),
            ),
        ]

        # Call the function to be tested
        lumi_doc = import_pipeline.convert_model_output_to_lumi_doc(
            model_output_string="dummy_string",
            concepts=[],
            file_id="test_file",
        )

        # Assert that the footnotes in the LumiDoc are what we expect
        self.assertEqual(len(expected_footnotes), len(lumi_doc.footnotes))
        for i in range(len(expected_footnotes)):
            self.assertEqual(
                asdict(expected_footnotes[i]), asdict(lumi_doc.footnotes[i])
            )

    @patch("import_pipeline.import_pipeline.convert_model_output_to_lumi_doc")
    @patch("import_pipeline.import_pipeline.llm")
    @patch("import_pipeline.import_pipeline.image_utils")
    @patch("import_pipeline.import_pipeline.latex_utils")
    @patch("import_pipeline.import_pipeline.fetch_utils")
    @patch("import_pipeline.import_pipeline.tempfile.TemporaryDirectory")
    def test_import_arxiv_latex_and_pdf(
        self,
        mock_tempdir,
        mock_fetch_utils,
        mock_latex_utils,
        mock_image_utils,
        mock_llm,
        mock_convert_to_doc,
    ):
        """Tests the full import pipeline with LaTeX and PDF."""
        # Setup Mocks
        mock_fetch_utils.fetch_pdf_bytes.return_value = b"pdf_bytes"
        mock_fetch_utils.fetch_latex_source.return_value = b"latex_source_bytes"
        mock_latex_utils.inline_tex_files.return_value = "inlined_latex_string"
        mock_llm.format_pdf_with_latex.return_value = "model_output"

        # Mock the returned LumiDoc to have an image
        mock_image_content = ImageContent(
            latex_path="fig1.png",
            storage_path="1234.5678/images/fig1.png",
            alt_text="",
            width=0,
            height=0,
            caption=None,
        )
        mock_figure_content = FigureContent(
            images=[mock_image_content],
            caption=LumiSpan(id="cap1", text="main caption", inner_tags=[]),
        )
        mock_doc = LumiDoc(
            markdown="",
            abstract=None,
            sections=[
                LumiSection(
                    id="s1",
                    heading=Heading(0, ""),
                    contents=[
                        LumiContent(id="c1", image_content=mock_image_content),
                        LumiContent(id="c2", figure_content=mock_figure_content),
                    ],
                )
            ],
            references=[],
            footnotes=[],
            concepts=[],
        )
        mock_convert_to_doc.return_value = mock_doc

        # Call the function
        arxiv_id = "1234.5678"
        version = "1"
        concepts = [
            LumiConcept(id="C1", name="Test Concept", contents=[], in_text_citations=[])
        ]
        metadata = ArxivMetadata(
            paper_id=arxiv_id,
            version=version,
            authors=[],
            title="",
            summary="",
            published_timestamp="",
            updated_timestamp="",
        )
        result, _ = import_pipeline.import_arxiv_latex_and_pdf(
            arxiv_id, version, concepts, metadata
        )

        # Assertions
        mock_fetch_utils.fetch_pdf_bytes.assert_called_once_with(
            f"https://arxiv.org/pdf/{arxiv_id}v{version}"
        )
        mock_fetch_utils.fetch_latex_source.assert_called_once_with(arxiv_id, version)

        mock_latex_utils.extract_tar_gz.assert_called_once()
        mock_latex_utils.find_main_tex_file.assert_called_once()
        mock_latex_utils.inline_tex_files.assert_called_once()

        mock_llm.format_pdf_with_latex.assert_called_once_with(
            pdf_data=b"pdf_bytes",
            latex_string="inlined_latex_string",
            concepts=concepts,
        )

        mock_convert_to_doc.assert_called_once_with(
            model_output_string="model_output",
            concepts=concepts,
            file_id=arxiv_id,
        )

        # Assert that image extraction from latex source is called with the right args
        mock_image_utils.extract_images_from_latex_source.assert_called_once()
        _, kwargs = mock_image_utils.extract_images_from_latex_source.call_args
        # The list should contain all images from ImageContent and FigureContent
        self.assertEqual(len(kwargs["image_contents"]), 2)
        self.assertEqual(kwargs["image_contents"][0], mock_image_content)
        self.assertEqual(kwargs["image_contents"][1], mock_image_content)

        self.assertIsInstance(result, LumiDoc)
        self.assertEqual(result, mock_doc)


if __name__ == "__main__":
    unittest.main()
