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

from parameterized import parameterized
from shared import import_tags
from shared.lumi_doc import (
    Heading,
    HtmlFigureContent,
    ImageContent,
    InnerTag,
    InnerTagName,
    ListContent,
    ListItem,
    LumiContent,
    LumiSection,
    LumiSpan,
    Position,
    TextContent,
)

from import_pipeline import (
    convert_html_to_lumi,
    convert_list_content,
    convert_lumi_spans,
)


class ConvertHtmlToLumiTest(unittest.TestCase):
    @patch.object(convert_lumi_spans, "get_unique_id", return_value="uid")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="uid")
    def test_convert_raw_output_to_spans(
        self,
        mock_get_unique_id_convert_html_to_lumi,
        mock_get_unique_id_convert_lumi_spans,
    ):
        """Tests that headings are nested correctly into sub_sections."""
        self.maxDiff = None
        del mock_get_unique_id_convert_html_to_lumi  # unused
        del mock_get_unique_id_convert_lumi_spans  # unused

        with self.subTest("model output containing a tag"):
            model_output = "Testing *italic*"
            actual_spans = convert_html_to_lumi.convert_raw_output_to_spans(
                model_output
            )

            expected_span = LumiSpan(
                id="uid",
                text="Testing italic",
                inner_tags=[
                    InnerTag(
                        id="uid",
                        tag_name=InnerTagName.EM,
                        metadata={},
                        position=Position(start_index=8, end_index=14),
                        children=[],
                    )
                ],
            )

            self.assertEqual(len(actual_spans), 1)
            self.assertEqual(actual_spans[0], expected_span)

        with self.subTest("model output containing no tag"):
            model_output = "Testing"
            actual_spans = convert_html_to_lumi.convert_raw_output_to_spans(
                model_output
            )

            expected_span = LumiSpan(
                id="uid",
                text="Testing",
                inner_tags=[],
            )

            self.assertEqual(len(actual_spans), 1)
            self.assertEqual(actual_spans[0], expected_span)

        with self.subTest("empty model output"):
            model_output = ""
            actual_spans = convert_html_to_lumi.convert_raw_output_to_spans(
                model_output
            )

            expected_span = LumiSpan(
                id="uid",
                text="",
                inner_tags=[],
            )

            self.assertEqual(len(actual_spans), 0)

    @patch.object(convert_lumi_spans, "get_unique_id", return_value="uid")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="uid")
    def test_nested_headings(
        self, mock_get_unique_id_html_to_lumi, mock_get_unique_id_lumi_spans
    ):
        """Tests that headings are nested correctly into sub_sections."""
        del mock_get_unique_id_html_to_lumi  # unused
        del mock_get_unique_id_lumi_spans  # unused

        self.maxDiff = None
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
        converted_sections = convert_html_to_lumi.convert_to_lumi_sections(
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
                        heading=Heading(heading_level=1, text=""),
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
                        heading=Heading(heading_level=1, text=""),
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
                "<ul><li><b>S</b>entence 1. Sentence 2.</li><li>Sentence 3.</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
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
                                                    inner_tags=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.BOLD,
                                                            metadata={},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=1,
                                                            ),
                                                            children=[],
                                                        )
                                                    ],
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
                        heading=Heading(heading_level=1, text=""),
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
                        heading=Heading(heading_level=1, text=""),
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
                        heading=Heading(heading_level=1, text=""),
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
                        heading=Heading(heading_level=1, text=""),
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.CONCEPT,
                                                    metadata={"id": "C1"},
                                                    position=Position(
                                                        start_index=10, end_index=22
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
                f"<p>Sentence ends with a reference.{import_tags.L_CITATION_START_PREFIX}Author2023Title{import_tags.L_CITATION_END}</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence ends with a reference.",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "Author2023Title"},
                                                    position=Position(
                                                        start_index=31, end_index=31
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
                "paragraph_with_footnote_marker_tag",
                f"<p>Sentence with a footnote{import_tags.L_FOOTNOTE_MARKER_PREFIX}1{import_tags.L_FOOTNOTE_MARKER_END}</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Sentence with a footnote",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.FOOTNOTE,
                                                    metadata={"id": "1"},
                                                    position=Position(
                                                        start_index=24, end_index=24
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.UNDERLINE,
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
                "paragraph_with_math_tag",
                "<p>The equation is $\\alpha + \\beta = \\gamma$.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.MATH,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=16, end_index=39
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
                "paragraph_with_displaymath_tag",
                "<p>The equation is $$\\alpha + \\beta = \\gamma$$.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.MATH_DISPLAY,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=16, end_index=39
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
                "paragraph_with_escaped_dollar_sign",
                "<p>It costs \\$40 and \\$50.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="It costs $40 and $50.",
                                            inner_tags=[],  # No math tag
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
                "paragraph_with_escaped_double_dollar_signs",
                "<p>It costs \\$\\$40 and \\$\\$50.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="It costs $$40 and $$50.",
                                            inner_tags=[],  # No math tag
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.A,
                                                    metadata={
                                                        "href": "https://google.com"
                                                    },
                                                    position=Position(
                                                        start_index=10, end_index=14
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.CODE,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=8, end_index=19
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.UNDERLINE,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=1, end_index=2
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.MATH,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=3, end_index=4
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=5, end_index=6
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.CONCEPT,
                                                    metadata={"id": "C3"},
                                                    position=Position(
                                                        start_index=7, end_index=8
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.ITALIC,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=9, end_index=10
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
                f"<p>Ref{import_tags.L_CITATION_START_PREFIX}id-4{import_tags.L_CITATION_END} and ref{import_tags.L_CITATION_START_PREFIX}id-5{import_tags.L_CITATION_END}.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Ref and ref.",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "id-4"},
                                                    position=Position(
                                                        start_index=3, end_index=3
                                                    ),
                                                    children=[],
                                                ),
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.REFERENCE,
                                                    metadata={"id": "id-5"},
                                                    position=Position(
                                                        start_index=11, end_index=11
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
                "span_reference_tag_in_paragraph",
                f"<p>A sentence with a ref{import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="A sentence with a ref.",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.SPAN_REFERENCE,
                                                    metadata={"id": "s1"},
                                                    position=Position(
                                                        start_index=21, end_index=21
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
                "only_span_reference_tag_no_content",
                f"<ul><li>Hi. {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                list_content=ListContent(
                                    is_ordered=False,
                                    list_items=[
                                        ListItem(
                                            subListContent=None,
                                            spans=[
                                                LumiSpan(
                                                    id="123",
                                                    text="Hi.",
                                                    inner_tags=[],
                                                ),
                                                LumiSpan(
                                                    id="123",
                                                    text="",
                                                    inner_tags=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.SPAN_REFERENCE,
                                                            metadata={"id": "s1"},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=0,
                                                            ),
                                                            children=[],
                                                        )
                                                    ],
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
            # TAGS SPANNING MULTIPLE SENTENCES
            (
                "tag_spanning_two_sentences",
                "<p>Sentence one <b>is bold. This bold continues</b> into sentence two.</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=13, end_index=21
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=19
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=7, end_index=25
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=18
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=4
                                                    ),
                                                    children=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.CONCEPT,
                                                            metadata={"id": "C1"},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=4,
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
                "bold_with_sentence_break_containing_math",
                "<p><strong>Proposition 4.1.</strong> <b>Let there. offset $text$</b></p>",
                [
                    LumiSection(
                        id="123",
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="Proposition 4.1.",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.STRONG,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=16
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="Let there.",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=10
                                                    ),
                                                    children=[],
                                                )
                                            ],
                                        ),
                                        LumiSpan(
                                            id="123",
                                            text="offset text",
                                            inner_tags=[
                                                InnerTag(
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=11
                                                    ),
                                                    children=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.MATH,
                                                            metadata={},
                                                            position=Position(
                                                                start_index=7,
                                                                end_index=11,
                                                            ),
                                                            children=[],
                                                        )
                                                    ],
                                                )
                                            ],
                                        ),
                                    ],
                                ),
                                image_content=None,
                                figure_content=None,
                                html_figure_content=None,
                                list_content=None,
                            )
                        ],
                        sub_sections=[],
                    )
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
                        heading=Heading(heading_level=1, text=""),
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
                                                    id="123",
                                                    tag_name=InnerTagName.BOLD,
                                                    metadata={},
                                                    position=Position(
                                                        start_index=0, end_index=4
                                                    ),
                                                    children=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.UNDERLINE,
                                                            metadata={},
                                                            position=Position(
                                                                start_index=0,
                                                                end_index=4,
                                                            ),
                                                            children=[
                                                                InnerTag(
                                                                    id="123",
                                                                    tag_name=InnerTagName.CONCEPT,
                                                                    metadata={
                                                                        "id": "C1"
                                                                    },
                                                                    position=Position(
                                                                        start_index=1,
                                                                        end_index=4,
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
                        heading=Heading(heading_level=1, text=""),
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
                                                id="123",
                                                tag_name=InnerTagName.BOLD,
                                                metadata={},
                                                position=Position(
                                                    start_index=2, end_index=6
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
                                        id="123",
                                        tag_name=InnerTagName.BOLD,
                                        metadata={},
                                        position=Position(start_index=2, end_index=6),
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
                        heading=Heading(heading_level=1, text=""),
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
            (
                "strip_square_brackets",
                "<p>This is text with [[some bracketed content]].</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is text with .",
                                            inner_tags=[],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
                True,  # strip_double_brackets
            ),
            (
                "strip_square_brackets",
                "<p>This is text with [[some bracketed content]].</p>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
                        contents=[
                            LumiContent(
                                id="123",
                                text_content=TextContent(
                                    tag_name="p",
                                    spans=[
                                        LumiSpan(
                                            id="123",
                                            text="This is text with [[some bracketed content]].",
                                            inner_tags=[],
                                        )
                                    ],
                                ),
                            )
                        ],
                    ),
                ],
                {},
                False,  # strip_double_brackets
            ),
            # EQUATION PLACEHOLDER TESTS
            (
                "list_with_equation_placeholder",
                "<ul><li>An equation [[LUMI_EQUATION_123]]</li></ul>",
                [
                    LumiSection(
                        id="123",
                        sub_sections=[],
                        heading=Heading(heading_level=1, text=""),
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
                                                    text="An equation E=mc^2",
                                                    inner_tags=[
                                                        InnerTag(
                                                            id="123",
                                                            tag_name=InnerTagName.MATH,
                                                            metadata={},
                                                            position=Position(
                                                                start_index=12,
                                                                end_index=18,
                                                            ),
                                                            children=[],
                                                        )
                                                    ],
                                                )
                                            ],
                                            subListContent=None,
                                        )
                                    ],
                                ),
                            )
                        ],
                    )
                ],
                {"[[LUMI_EQUATION_123]]": "$E=mc^2$"},
            ),
        ]
    )
    @patch.object(convert_list_content, "get_unique_id", return_value="123")
    @patch.object(convert_lumi_spans, "get_unique_id", return_value="123")
    @patch.object(convert_html_to_lumi, "get_unique_id", return_value="123")
    def test_convert_to_lumi_sections(
        self,
        name,
        html,
        expected_sections,
        placeholder_map,
        strip_double_brackets=False,
        mock_get_unique_id_convert_html_to_lumi=None,
        mock_get_unique_id_convert_lumi_spans=None,
        mock_get_unique_id_convert_list_content=None,
    ):
        self.maxDiff = None
        del name  # unused
        del mock_get_unique_id_convert_html_to_lumi  # unused
        del mock_get_unique_id_convert_lumi_spans  # unused
        del mock_get_unique_id_convert_list_content  # unused

        # Call convert_to_lumi_sections directly
        converted_sections = convert_html_to_lumi.convert_to_lumi_sections(
            html,
            placeholder_map=placeholder_map,
            strip_double_brackets=strip_double_brackets,
        )

        # Assert that the document is as expected.
        self.assertEqual(len(expected_sections), len(converted_sections))

        for i in range(len(expected_sections)):
            self.assertEqual(
                asdict(expected_sections[i]), asdict(converted_sections[i])
            )
