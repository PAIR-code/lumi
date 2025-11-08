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

# summaries_test.py
import unittest
from unittest.mock import patch

from shared.lumi_doc import (
    Heading,
    InnerTagName,
    ListContent,
    ListItem,
    LumiAbstract,
    LumiContent,
    LumiDoc,
    LumiSection,
    LumiSpan,
    Position,
    TextContent,
)

from import_pipeline.summaries import (
    AbstractExcerptSchema,
    FetchLumiSummariesRequestOptions,
    LabelSchema,
    _generate_section_summaries_prompt,
    _generate_span_summaries_prompt,
    _get_all_contents_with_text,
    _get_all_sections_with_text,
    _get_all_spans_from_doc,
    _get_generate_content_summaries_prompt,
    _select_abstract_excerpt_prompt,
    generate_lumi_summaries,
)


class SummariesTest(unittest.TestCase):
    def setUp(self):
        # Content and Section summaries filter for text > MAX_CHARACTER_LENGTH (100)
        # Ensure these strings are just over 100 characters, but more concise in content
        content_text_1 = "Summary content for section 1. This text must be over one hundred characters to be included in the summarization prompt for testing purposes. This is a very long sentence."
        content_text_2 = "Summary content for section 2. This text also needs to exceed one hundred characters for processing by the summarization logic. Another long sentence for testing."
        list_item_text_1 = "List item content for summarization. This specific item must be over one hundred characters long to be included in the content summary. Yet another long sentence."
        list_item_text_2 = "Second list item content. This distinct item also needs to be over one hundred characters to ensure it's processed as a separate content summary. More unique text here."
        abstract_text_1 = "This is the first sentence of the abstract."
        abstract_text_2 = "This is the most important sentence of the abstract, containing the key finding."
        abstract_text_3 = "This is the final sentence of the abstract."

        self.mock_text_content1 = LumiContent(
            id="tc1",
            text_content=TextContent(
                tag_name="p",
                spans=[LumiSpan(id="s1a", text=content_text_1, inner_tags=[])],
            ),
        )
        self.mock_text_content2 = LumiContent(
            id="tc2",
            text_content=TextContent(
                tag_name="p",
                spans=[LumiSpan(id="s2a", text=content_text_2, inner_tags=[])],
            ),
        )

        self.mock_list_item1 = ListItem(
            spans=[LumiSpan(id="s3a", text=list_item_text_1, inner_tags=[])]
        )
        self.mock_list_content1 = LumiContent(
            id="lc1",
            list_content=ListContent(
                is_ordered=False, list_items=[self.mock_list_item1]
            ),
        )
        self.mock_list_item2 = ListItem(
            spans=[LumiSpan(id="s3b", text=list_item_text_2, inner_tags=[])]
        )
        self.mock_list_content2 = LumiContent(
            id="lc2",
            list_content=ListContent(
                is_ordered=False, list_items=[self.mock_list_item2]
            ),
        )

        self.mock_abstract_content = LumiContent(
            id="ac1",
            text_content=TextContent(
                tag_name="p",
                spans=[
                    LumiSpan(id="abs1", text=abstract_text_1, inner_tags=[]),
                    LumiSpan(id="abs2", text=abstract_text_2, inner_tags=[]),
                    LumiSpan(id="abs3", text=abstract_text_3, inner_tags=[]),
                ],
            ),
        )
        self.mock_abstract = LumiAbstract(contents=[self.mock_abstract_content])

        self.mock_section1 = LumiSection(
            id="sec1",
            heading=Heading(heading_level=2, text="Section One"),
            contents=[self.mock_text_content1],
        )
        self.mock_section2 = LumiSection(
            id="sec2",
            heading=Heading(heading_level=2, text="Section Two"),
            contents=[self.mock_text_content2, self.mock_list_content2],
        )
        self.mock_document = LumiDoc(
            markdown="Mock document content",
            sections=[self.mock_section1, self.mock_section2],
            concepts=[],
            abstract=self.mock_abstract,
            references=None,
            summaries=None,
            metadata=None,
            loading_status=None,
        )

    def _reset_mocks(self, *mocks):
        """Helper to reset multiple mock objects."""
        for mock_obj in mocks:
            mock_obj.reset_mock()

    @patch("import_pipeline.summaries.get_unique_id", return_value="unique_span_id")
    @patch("import_pipeline.summaries.llm.call_predict_with_schema")
    def test_generate_lumi_summaries(
        self, mock_call_predict_with_schema, mock_get_unique_id
    ):
        with self.subTest(name="include_section_summaries"):
            self._reset_mocks(mock_call_predict_with_schema, mock_get_unique_id)
            # Mock return values for gemini.call_predict_with_schema
            mock_call_predict_with_schema.return_value = [
                LabelSchema(id="sec1", label="Summary for <b>Section One</b>"),
                LabelSchema(id="sec2", label="Summary for Section Two"),
                LabelSchema(id="sec3", label="Summary for *Section Three*"),
            ]

            section_data = _get_all_sections_with_text(self.mock_document)
            expected_prompt = _generate_section_summaries_prompt(section_data)

            options = FetchLumiSummariesRequestOptions(include_section_summaries=True)
            summaries = generate_lumi_summaries(self.mock_document, options)

            self.assertEqual(len(summaries.section_summaries), 3)
            self.assertEqual(summaries.section_summaries[0].id, "sec1")
            self.assertEqual(
                summaries.section_summaries[0].summary.text, "Summary for Section One"
            )
            self.assertEqual(len(summaries.section_summaries[0].summary.inner_tags), 1)
            self.assertEqual(
                summaries.section_summaries[0].summary.inner_tags[0].tag_name,
                InnerTagName.BOLD,
            )
            self.assertEqual(
                summaries.section_summaries[0].summary.inner_tags[0].position,
                Position(start_index=12, end_index=23),
            )

            self.assertEqual(summaries.section_summaries[1].id, "sec2")
            self.assertEqual(
                summaries.section_summaries[1].summary.text, "Summary for Section Two"
            )
            self.assertEqual(len(summaries.section_summaries[1].summary.inner_tags), 0)

            self.assertEqual(summaries.section_summaries[2].id, "sec3")
            self.assertEqual(
                summaries.section_summaries[2].summary.text, "Summary for Section Three"
            )
            self.assertEqual(len(summaries.section_summaries[2].summary.inner_tags), 1)
            self.assertEqual(
                summaries.section_summaries[2].summary.inner_tags[0].tag_name,
                InnerTagName.EM,
            )
            self.assertEqual(
                summaries.section_summaries[2].summary.inner_tags[0].position,
                Position(start_index=12, end_index=25),
            )

            # Check that the mock was called with the correct schema type
            mock_call_predict_with_schema.assert_called_once_with(
                expected_prompt, response_schema=list[LabelSchema]
            )
            self.assertIsNone(summaries.abstract_excerpt_span_id)

        with self.subTest(name="include_content_summaries"):
            self._reset_mocks(mock_call_predict_with_schema, mock_get_unique_id)
            # Mock return values for gemini.call_predict_with_schema
            mock_call_predict_with_schema.return_value = [
                LabelSchema(id="tc1", label="Summary for Text Content 1"),
                LabelSchema(id="tc2", label="Summary for <b>Text Content 2</b>"),
                LabelSchema(id="lc2", label="Summary for List Content 2"),
            ]

            # Manually construct the expected prompt for content summaries
            content_data = _get_all_contents_with_text(self.mock_document)
            expected_prompt = _get_generate_content_summaries_prompt(content_data)

            options = FetchLumiSummariesRequestOptions(include_content_summaries=True)
            summaries = generate_lumi_summaries(self.mock_document, options)

            self.assertEqual(len(summaries.content_summaries), 3)
            self.assertEqual(summaries.content_summaries[0].id, "tc1")
            self.assertEqual(summaries.content_summaries[1].id, "tc2")
            self.assertEqual(
                summaries.content_summaries[1].summary.text,
                "Summary for Text Content 2",
            )
            self.assertEqual(len(summaries.content_summaries[1].summary.inner_tags), 1)
            self.assertEqual(summaries.content_summaries[2].id, "lc2")
            mock_call_predict_with_schema.assert_called_once_with(
                expected_prompt, response_schema=list[LabelSchema]
            )
            self.assertIsNone(summaries.abstract_excerpt_span_id)

        with self.subTest(name="include_span_summaries"):
            self._reset_mocks(mock_call_predict_with_schema, mock_get_unique_id)
            # Mock return values for gemini.call_predict_with_schema
            mock_call_predict_with_schema.return_value = [
                LabelSchema(id="s1a", label="Summary for Span 1a"),
                LabelSchema(id="s2a", label="Summary for Span 2a"),
                LabelSchema(id="s3b", label="Summary for $Span 3b$"),
            ]

            # Manually construct the expected prompt for span summaries
            spans = _get_all_spans_from_doc(self.mock_document)
            expected_prompt = _generate_span_summaries_prompt(spans)

            options = FetchLumiSummariesRequestOptions(include_span_summaries=True)
            summaries = generate_lumi_summaries(self.mock_document, options)

            self.assertEqual(len(summaries.span_summaries), 3)
            self.assertEqual(summaries.span_summaries[0].id, "s1a")
            self.assertEqual(summaries.span_summaries[1].id, "s2a")
            self.assertEqual(summaries.span_summaries[2].id, "s3b")
            self.assertEqual(
                summaries.span_summaries[2].summary.text, "Summary for Span 3b"
            )
            self.assertEqual(len(summaries.span_summaries[2].summary.inner_tags), 1)
            self.assertEqual(
                summaries.span_summaries[2].summary.inner_tags[0].tag_name,
                InnerTagName.MATH,
            )

            mock_call_predict_with_schema.assert_called_once_with(
                expected_prompt, response_schema=list[LabelSchema]
            )
            self.assertIsNone(summaries.abstract_excerpt_span_id)

        with self.subTest(name="no_summaries_included"):
            self._reset_mocks(mock_call_predict_with_schema, mock_get_unique_id)

            options = FetchLumiSummariesRequestOptions()  # All false
            summaries = generate_lumi_summaries(self.mock_document, options)
            self.assertEqual(len(summaries.section_summaries), 0)
            self.assertEqual(len(summaries.content_summaries), 0)
            self.assertEqual(len(summaries.span_summaries), 0)
            mock_call_predict_with_schema.assert_not_called()
            self.assertIsNone(summaries.abstract_excerpt_span_id)

    @patch("import_pipeline.summaries.llm.call_predict_with_schema")
    def test_generate_lumi_summaries_with_abstract_excerpt(
        self, mock_call_predict_with_schema
    ):
        self._reset_mocks(mock_call_predict_with_schema)
        # Mock the response for the abstract excerpt selection
        expected_span_id = "abs2"
        mock_call_predict_with_schema.return_value = AbstractExcerptSchema(
            id=expected_span_id
        )

        # Construct the expected prompt for the abstract excerpt
        abstract_spans = []
        for content in self.mock_document.abstract.contents:
            if content.text_content:
                abstract_spans.extend(content.text_content.spans)
        expected_prompt = _select_abstract_excerpt_prompt(abstract_spans)

        # Call the main function with abstract excerpt option enabled
        options = FetchLumiSummariesRequestOptions(include_abstract_excerpt=True)
        summaries = generate_lumi_summaries(self.mock_document, options)

        # Assert that the correct span ID was populated
        self.assertEqual(summaries.abstract_excerpt_span_id, expected_span_id)
        # Assert that the gemini call was made with the correct prompt
        mock_call_predict_with_schema.assert_called_once_with(
            expected_prompt, response_schema=AbstractExcerptSchema
        )
