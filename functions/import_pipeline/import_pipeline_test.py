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
from unittest.mock import patch, MagicMock
from parameterized import parameterized
from shared.lumi_doc import (
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
    LumiReference,
    LumiDoc,
    LumiConcept,
)
from import_pipeline import import_pipeline
from shared import import_tags
from shared.types import ArxivMetadata, ImageMetadata
from dataclasses import asdict


class PreprocessAndReplaceFiguresTest(unittest.TestCase):
    @patch.object(import_pipeline, "get_unique_id")
    def test_interleaved_image_and_html_figure(self, mock_get_unique_id):
        self.maxDiff = None
        markdown_input = f"Some text {import_tags.L_IMG_START_PREFIX}fig1.png{import_tags.L_IMG_END} and more text {import_tags.L_HTML_START_PREFIX}T1{import_tags.L_HTML_END}<div>...</div>{import_tags.L_HTML_START_PREFIX}T1{import_tags.L_HTML_END}{import_tags.L_HTML_CAP_START_PREFIX}T1{import_tags.L_HTML_CAP_END}Cap{import_tags.L_HTML_CAP_START_PREFIX}T1{import_tags.L_HTML_CAP_END}"
        placeholder_map = {}

        # The mock needs to provide enough unique IDs for all calls within preprocess_and_replace_figures.
        # In this case: 1 for the HTML figure, 1 for its caption, and 1 for the image.
        mock_get_unique_id.side_effect = ["html_id_1", "caption_id_1", "image_id_1"]

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
        self.assertEqual(html_content.html, "<div>...</div>")
        self.assertIsNotNone(html_content.caption)
        self.assertEqual(html_content.caption.text, "Cap")
        self.assertEqual(html_content.caption.id, "caption_id_1")

        # Validate ImageContent
        image_content = placeholder_map[image_placeholder_id].image_content
        self.assertIsNotNone(image_content)
        self.assertEqual(image_content.latex_path, "fig1.png")
        self.assertIsNone(image_content.caption)


class ImportPipelineTest(unittest.TestCase):
    @patch.object(import_pipeline, "get_unique_id")
    def test_nested_headings(self, mock_get_unique_id):
        """Tests that headings are nested correctly into sub_sections."""
        self.maxDiff = None
        # This test will fail until the nesting logic is implemented.
        # It's added first as per the user's request.
        html_input = (
            "<h1>Title 1</h1>"
            "<h2>Subtitle 1.1</h2>"
            "<p>Content 1.1</p>"
            "<h3>Sub-subtitle 1.1.1</h3>"
            "<p>Content 1.1.1</p>"
            "<h2>Subtitle 1.2</h2>"
            "<p>Content 1.2</p>"
            "<h1>Title 2</h1>"
            "<p>Content 2</p>"
        )

        # Mock get_unique_id to return predictable IDs for easier comparison
        mock_get_unique_id.return_value = "uid"

        expected_sections = [
            LumiSection(
                id="uid",
                heading=Heading(heading_level=1, text="Title 1"),
                contents=[],
                sub_sections=[
                    LumiSection(
                        id="uid",
                        heading=Heading(heading_level=2, text="Subtitle 1.1"),
                        contents=[
                            LumiContent(
                                id="uid",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="uid", text="Content 1.1", inner_tags=[]
                                        )
                                    ],
                                ),
                            )
                        ],
                        sub_sections=[
                            LumiSection(
                                id="uid",
                                heading=Heading(
                                    heading_level=3, text="Sub-subtitle 1.1.1"
                                ),
                                contents=[
                                    LumiContent(
                                        id="uid",
                                        text_content=TextContent(
                                            tag_name="p",
                                            spans=[
                                                LumiSpan(
                                                    id="uid",
                                                    text="Content 1.1.1",
                                                    inner_tags=[],
                                                )
                                            ],
                                        ),
                                    )
                                ],
                                sub_sections=[],
                            )
                        ],
                    ),
                    LumiSection(
                        id="uid",
                        heading=Heading(heading_level=2, text="Subtitle 1.2"),
                        contents=[
                            LumiContent(
                                id="uid",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="uid", text="Content 1.2", inner_tags=[]
                                        )
                                    ],
                                ),
                            )
                        ],
                        sub_sections=[],
                    ),
                ],
            ),
            LumiSection(
                id="uid",
                heading=Heading(heading_level=1, text="Title 2"),
                contents=[
                    LumiContent(
                        id="uid",
                        text_content=TextContent(
                            tag_name="p",
                            spans=[LumiSpan(id="uid", text="Content 2", inner_tags=[])],
                        ),
                    )
                ],
                sub_sections=[],
            ),
        ]

        # Call convert_to_lumi_sections directly
        converted_sections = import_pipeline.convert_to_lumi_sections(
            html_input, placeholder_map={}
        )

        # Assert that the document is as expected.
        self.assertEqual(len(expected_sections), len(converted_sections))
        self.assertEqual(asdict(expected_sections[0]), asdict(converted_sections[0]))
        self.assertEqual(asdict(expected_sections[1]), asdict(converted_sections[1]))

    @parameterized.expand(
        [
            # BASIC TESTS
            (
                "single_paragraph",
                "<p>Sentence 1</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence 1",
                                            inner_tags=[],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "single_paragraph_with_two_sentences",
                "<p>Sentence 1. Sentence 2.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence 1.",
                                            inner_tags=[],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="Sentence 2.",
                                            inner_tags=[],
                                        ),
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "single_paragraph_with_heading",
                "<h2>Heading</h2><p>Sentence 1.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=2, text="Heading"),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence 1.",
                                            inner_tags=[],
                                        ),
                                    ],
                                ),
                            ),
                        ],
                    ),
                ],
                {},
            ),
            # LIST TESTS
            (
                "unordered_list_with_two_sentences_in_li",
                "<ul><li>Sentence 1. Sentence 2.</li><li>Sentence 3.</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Sentence 1.",
                                                    inner_tags=[],
                                                ),
                                                LumiSpan(
                                                    id="123",
                                                    text="Sentence 2.",
                                                    inner_tags=[],
                                                ),
                                            ],
                                            subListContent=None,
                                        ),
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Sentence 3.",
                                                    inner_tags=[],
                                                ),
                                            ],
                                            subListContent=None,
                                        ),
                                    ],
                                ),
                            ),
                        ],
                    ),
                ],
                {},
            ),
            (
                "nested_unordered_list",
                "<ul><li>Item 1<ul><li>Subitem 1.1</li><li>Subitem 1.2</li></ul></li><li>Item 2</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Item 1",
                                                    inner_tags=[],
                                                )
                                            ],
                                            subListContent=ListContent(
                                                is_ordered=False,
                                                list_items=[
                                                    ListItem(
                                                        spans=[
                                                            LumiSpan(
                                                                id="123",
                                                                text="Subitem 1.1",
                                                                inner_tags=[],
                                                            )
                                                        ],
                                                        subListContent=None,
                                                    ),
                                                    ListItem(
                                                        spans=[
                                                            LumiSpan(
                                                                id="123",
                                                                text="Subitem 1.2",
                                                                inner_tags=[],
                                                            )
                                                        ],
                                                        subListContent=None,
                                                    ),
                                                ],
                                            ),
                                        ),
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Item 2",
                                                    inner_tags=[],
                                                )
                                            ],
                                            subListContent=None,
                                        ),
                                    ],
                                ),
                            ),
                        ],
                    ),
                ],
                {},
            ),
            (
                "list_item_with_text_before_and_after_nested_list",
                "<ul><li>Text before <ul><li>Nested item</li></ul> Text after.</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Text before  Text after.",
                                                    inner_tags=[],
                                                )
                                            ],
                                            subListContent=ListContent(
                                                is_ordered=False,
                                                list_items=[
                                                    ListItem(
                                                        spans=[
                                                            LumiSpan(
                                                                id="123",
                                                                text="Nested item",
                                                                inner_tags=[],
                                                            )
                                                        ],
                                                        subListContent=None,
                                                    )
                                                ],
                                            ),
                                        )
                                    ],
                                ),
                            )
                        ],
                    )
                ],
                {},
            ),
            (
                "list_item_with_nested_list_and_no_text",
                "<ul><li><ul><li>Nested item</li></ul></li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            spans=[],
                                            subListContent=ListContent(
                                                is_ordered=False,
                                                list_items=[
                                                    ListItem(
                                                        spans=[
                                                            LumiSpan(
                                                                id="123",
                                                                text="Nested item",
                                                                inner_tags=[],
                                                            )
                                                        ],
                                                        subListContent=None,
                                                    )
                                                ],
                                            ),
                                        )
                                    ],
                                ),
                            )
                        ],
                    )
                ],
                {},
            ),
            (
                "list_with_list_item_with_p_tag",
                "<ul><li><p>content</p></li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="content",
                                                    inner_tags=[],
                                                ),
                                            ],
                                            subListContent=None,
                                        ),
                                    ],
                                ),
                            ),
                        ],
                    ),
                ],
                {},
            ),
            # TAG TESTS
            (
                "paragraph_with_concept_tag",
                f"<p>This is a {import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}concept text{import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is a concept text.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.CONCEPT,
                                                    metadata={"id": "C1"},
                                                    position=Position(
                                                        start_index=10, end_index=21
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "paragraph_with_reference_tag",
                f"<p>Sentence ends with a reference.{import_tags.L_CITATION_START_PREFIX}Author2023Title{import_tags.L_CITATION_END}End{import_tags.L_CITATION_START_PREFIX}Author2023Title{import_tags.L_CITATION_END}</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence ends with a reference.End",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "Author2023Title"},
                                                    position=Position(
                                                        start_index=31, end_index=33
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "paragraph_with_underline_tag",
                "<p>This is <u>underlined</u> text.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is underlined text.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.UNDERLINE,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=8, end_index=17
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "paragraph_with_math_tag",
                "<p>The equation is $\\alpha + \\beta = \\gamma$.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="The equation is \\alpha + \\beta = \\gamma.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.MATH,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=16, end_index=38
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "paragraph_with_a_tag",
                '<p>This is a <a href="https://google.com">link</a>.</p>',
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is a link.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.A,
                                                    metadata={
                                                        "href": "https://google.com"
                                                    },
                                                    position=Position(
                                                        start_index=10, end_index=13
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "paragraph_with_code_tag",
                "<p>This is <code>inline code</code>.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is inline code.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.CODE,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=8, end_index=18
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "mixed_tags_underline_math_bold_concept_italic",
                f"<p>0<u>1</u>2$3$4<b>5</b>6{import_tags.L_CONCEPT_START_PREFIX}C3{import_tags.L_CONCEPT_END}7{import_tags.L_CONCEPT_START_PREFIX}C3{import_tags.L_CONCEPT_END}8<i>9</i>10</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="012345678910",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.UNDERLINE,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=1, end_index=1
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    tag_name=InnerTagName.MATH,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=3, end_index=3
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=5, end_index=5
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    tag_name=InnerTagName.CONCEPT,
                                                    metadata={"id": "C3"},
                                                    position=Position(
                                                        start_index=7, end_index=7
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    tag_name=InnerTagName.ITALIC,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=9, end_index=9
                                                    ),
                                                    children=[],
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "multiple_reference_tags_in_paragraph",
                f"<p>Ref {import_tags.L_CITATION_START_PREFIX}id-4{import_tags.L_CITATION_END}One{import_tags.L_CITATION_START_PREFIX}id-4{import_tags.L_CITATION_END} and ref {import_tags.L_CITATION_START_PREFIX}id-5{import_tags.L_CITATION_END}Two{import_tags.L_CITATION_START_PREFIX}id-5{import_tags.L_CITATION_END}.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Ref One and ref Two.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "id-4"},
                                                    position=Position(
                                                        start_index=4, end_index=6
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "id-5"},
                                                    position=Position(
                                                        start_index=16, end_index=18
                                                    ),
                                                    children=[],
                                                ),
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "only_reference_tag_in_paragraph",
                f"<p>{import_tags.L_CITATION_START_PREFIX}id-7{import_tags.L_CITATION_END}OnlyRef{import_tags.L_CITATION_START_PREFIX}id-7{import_tags.L_CITATION_END}</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="OnlyRef",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "id-7"},
                                                    position=Position(
                                                        start_index=0, end_index=6
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "only_span_reference_tag_in_paragraph",
                f"<p>{import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}some content{import_tags.S_REF_END_GENERIC}</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="some content",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.SPAN_REFERENCE,
                                                    metadata={"id": "s1"},
                                                    position=Position(
                                                        start_index=0, end_index=11
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            # TAGS SPANNING MULTIPLE SENTENCES
            (
                "tag_spanning_two_sentences",
                "<p>Sentence one <b>is bold. This bold continues</b> into sentence two.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence one is bold.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=13, end_index=20
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="This bold continues into sentence two.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=18
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "tag_starting_before_sentence_and_ending_after",
                "<p>Prefix <b>Sentence part one. Sentence part two.</b> Suffix.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Prefix Sentence part one.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=7, end_index=24
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="Sentence part two.",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=17
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="Suffix.",
                                            inner_tags=[],
                                        ),
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            # NESTED TAGS
            (
                "bold_containing_concept",
                f"<p><b>{import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}text{import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}</b></p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="text",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=3
                                                    ),
                                                    children=[
                                                        InnerTag(
                                                            tag_name=InnerTagName.CONCEPT,
                                                            metadata={"id": "C1"},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=3,
                                                            ),
                                                            children=[],
                                                        )
                                                    ],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            (
                "complex_nesting_bold_underline_concept",
                f"<p><b><u>t{import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}ext{import_tags.L_CONCEPT_START_PREFIX}C1{import_tags.L_CONCEPT_END}</u></b></p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="text",
                                            inner_tags=[
                                                InnerTag(
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=3
                                                    ),
                                                    children=[
                                                        InnerTag(
                                                            tag_name=InnerTagName.UNDERLINE,
                                                            metadata={},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=3,
                                                            ),
                                                            children=[
                                                                InnerTag(
                                                                    tag_name=InnerTagName.CONCEPT,
                                                                    metadata={
                                                                        "id": "C1"
                                                                    },
                                                                    position=Position(
                                                                        start_index=1,
                                                                        end_index=3,
                                                                    ),
                                                                    children=[],
                                                                )
                                                            ],
                                                        )
                                                    ],
                                                )
                                            ],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
            ),
            # Image content tests
            (
                "image_with_caption_with_bold_tag",
                "<p>[[LUMI_PLACEHOLDER_123]]</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                image_content=ImageContent(
                                    latex_path="fig1.png",
                                    storage_path="file_id/images/fig1.png",
                                    alt_text="",
                                    caption=LumiSpan(
                                        id="123",
                                        text="A bold caption.",
                                        inner_tags=[
                                            InnerTag(
                                                tag_name=InnerTagName.BOLD,
                                                metadata={},
                                                position=Position(
                                                    start_index=2, end_index=5
                                                ),
                                                children=[],
                                            )
                                        ],
                                    ),
                                    width=0.0,
                                    height=0.0,
                                ),
                            ),
                        ],
                    ),
                ],
                {
                    "[[LUMI_PLACEHOLDER_123]]": LumiContent(
                        id="123",
                        image_content=ImageContent(
                            latex_path="fig1.png",
                            storage_path="file_id/images/fig1.png",
                            alt_text="",
                            caption=LumiSpan(
                                id="123",
                                text="A bold caption.",
                                inner_tags=[
                                    InnerTag(
                                        tag_name=InnerTagName.BOLD,
                                        metadata={},
                                        position=Position(start_index=2, end_index=5),
                                        children=[],
                                    )
                                ],
                            ),
                            width=0.0,
                            height=0.0,
                        ),
                    ),
                },
            ),
            # HTML Figure Content Tests
            (
                "paragraph_with_html_figure",
                "<h1>heading</h1><p>Text before. [[LUMI_PLACEHOLDER_123]] Text after.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text="heading"),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Text before.",
                                            inner_tags=[],
                                        )
                                    ],
                                ),
                            ),
                            LumiContent(
                                id="123",
                                html_figure_content=HtmlFigureContent(
                                    html="table...", caption=None
                                ),
                            ),
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text=" Text after.",
                                            inner_tags=[],
                                        )
                                    ],
                                ),
                            ),
                        ],
                    )
                ],
                {
                    "[[LUMI_PLACEHOLDER_123]]": LumiContent(
                        id="123",
                        html_figure_content=HtmlFigureContent(
                            html="table...", caption=None
                        ),
                    )
                },
            ),
            (
                "paragraph_with_html_figure_and_caption",
                "<p>[[LUMI_PLACEHOLDER_123]]</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=0, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                html_figure_content=HtmlFigureContent(
                                    html="<div>...</div>",
                                    caption=LumiSpan(
                                        id="123", text="My caption.", inner_tags=[]
                                    ),
                                ),
                            ),
                        ],
                    )
                ],
                {
                    "[[LUMI_PLACEHOLDER_123]]": LumiContent(
                        id="123",
                        html_figure_content=HtmlFigureContent(
                            html="<div>...</div>",
                            caption=LumiSpan(
                                id="123", text="My caption.", inner_tags=[]
                            ),
                        ),
                    )
                },
            ),
        ]
    )
    @patch.object(import_pipeline, "get_unique_id", return_value="123")
    def test_convert_to_lumi_sections(
        self,
        name,
        html,
        expected_sections,
        placeholder_map,
        mock_get_unique_id,
    ):
        self.maxDiff = None
        del name  # unused
        del mock_get_unique_id  # unused

        # Call convert_to_lumi_sections directly
        converted_sections = import_pipeline.convert_to_lumi_sections(
            html, placeholder_map=placeholder_map
        )

        # Assert that the document is as expected.
        self.assertEqual(len(expected_sections), len(converted_sections))

        for i in range(len(expected_sections)):
            self.assertEqual(
                asdict(expected_sections[i]), asdict(converted_sections[i])
            )

    @patch.object(import_pipeline, "get_unique_id", return_value="123")
    @patch("import_pipeline.markdown_utils.parse_lumi_import")
    def test_convert_model_output_to_lumi_doc_with_references(
        self, mock_parse_lumi_import, mock_get_unique_id
    ):
        """Tests that inner tags in references are correctly parsed."""
        self.maxDiff = None
        del mock_get_unique_id  # unused

        # Mock the output of the markdown parser
        mock_parse_lumi_import.return_value = {
            "abstract": "",
            "content": "",
            "references": [
                {"id": "ref1", "content": "This is a <b>bold</b> reference."},
                {"id": "ref2", "content": "This is an <i>italic</i> one."},
            ],
        }

        expected_references = [
            LumiReference(
                id="ref1",
                span=LumiSpan(
                    id="123",
                    text="This is a bold reference.",
                    inner_tags=[
                        InnerTag(
                            tag_name=InnerTagName.BOLD,
                            metadata={},
                            position=Position(start_index=10, end_index=13),
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
                            tag_name=InnerTagName.ITALIC,
                            metadata={},
                            position=Position(start_index=11, end_index=16),
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

    @patch("import_pipeline.import_pipeline.convert_model_output_to_lumi_doc")
    @patch("import_pipeline.import_pipeline.gemini")
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
        mock_gemini,
        mock_convert_to_doc,
    ):
        """Tests the full import pipeline with LaTeX and PDF."""
        # Setup Mocks
        mock_fetch_utils.fetch_pdf_bytes.return_value = b"pdf_bytes"
        mock_fetch_utils.fetch_latex_source.return_value = b"latex_source_bytes"
        mock_latex_utils.inline_tex_files.return_value = "inlined_latex_string"
        mock_gemini.format_pdf_with_latex.return_value = "model_output"

        # Mock the returned LumiDoc to have an image
        mock_image_content = ImageContent(
            latex_path="fig1.png",
            storage_path="1234.5678/images/fig1.png",
            alt_text="",
            width=0,
            height=0,
            caption=None,
        )
        mock_doc = LumiDoc(
            markdown="",
            abstract=None,
            sections=[
                LumiSection(
                    id="s1",
                    heading=Heading(0, ""),
                    contents=[LumiContent(id="c1", image_content=mock_image_content)],
                )
            ],
            references=[],
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
        result = import_pipeline.import_arxiv_latex_and_pdf(
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

        mock_gemini.format_pdf_with_latex.assert_called_once_with(
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
        self.assertEqual(kwargs["image_contents"], [mock_image_content])

        self.assertIsInstance(result, LumiDoc)
        self.assertEqual(result, mock_doc)


if __name__ == "__main__":
    unittest.main()
