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

# prompt_utils_test.py
import unittest
from unittest.mock import MagicMock

from shared.prompt_utils import (
    get_json_from_response,
    get_labels_from_response,
    get_formatted_spans_list,
    get_all_spans_from_doc,
    ModelResponse,
)
from shared.lumi_doc import (
    LumiDoc,
    LumiSection,
    LumiContent,
    LumiSpan,
    Label,
    Heading,
    TextContent,
    ListContent,
    ListItem,
)


class PromptUtilsTest(unittest.TestCase):
    def test_get_json_from_response(self):
        # Test case 1: Valid JSON response
        with self.subTest(name="valid_json"):
            mock_response = ModelResponse(model_output=['```json{"key": "value"}```'])
            expected_json = {"key": "value"}
            self.assertEqual(get_json_from_response(mock_response), expected_json)

        # Test case 2: Valid JSON response without decorator
        with self.subTest(name="valid_json_no_decorator"):
            mock_response = ModelResponse(model_output=['{"key": "value"}'])
            expected_json = {"key": "value"}
            self.assertEqual(get_json_from_response(mock_response), expected_json)

        # Test case 3: Empty model_output
        with self.subTest(name="empty_model_output"):
            mock_response = ModelResponse(model_output=[])
            expected_json = {}
            self.assertEqual(get_json_from_response(mock_response), expected_json)

        # Test case 4: None model_output
        with self.subTest(name="none_model_output"):
            mock_response = ModelResponse(model_output=None)
            expected_json = {}
            self.assertEqual(get_json_from_response(mock_response), expected_json)

        # Test case 5: Invalid JSON string
        with self.subTest(name="invalid_json"):
            mock_response = ModelResponse(model_output=["invalid json string"])
            expected_json = {}
            self.assertEqual(get_json_from_response(mock_response), expected_json)

        # Test case 6: JSON list
        with self.subTest(name="json_list"):
            mock_response = ModelResponse(
                model_output=[
                    '```json[{"id": "1", "label": "A"}, {"id": "2", "label": "B"}]```'
                ]
            )
            expected_json = [{"id": "1", "label": "A"}, {"id": "2", "label": "B"}]
            self.assertEqual(get_json_from_response(mock_response), expected_json)

    def test_get_labels_from_response(self):
        # Test case 1: Valid labels in JSON
        with self.subTest(name="valid_labels"):
            mock_json_output = (
                '[{"id": "s1", "label": "summary1"}, {"id": "s2", "label": "summary2"}]'
            )
            mock_response = ModelResponse(
                model_output=[f"```json{mock_json_output}```"]
            )
            expected_labels = [
                Label(id="s1", label="summary1"),
                Label(id="s2", label="summary2"),
            ]
            self.assertEqual(get_labels_from_response(mock_response), expected_labels)

        # Test case 2: Empty model_output
        with self.subTest(name="empty_model_output"):
            mock_response = ModelResponse(model_output=[])
            expected_labels = []
            self.assertEqual(get_labels_from_response(mock_response), expected_labels)

        # Test case 3: None model_output
        with self.subTest(name="none_model_output"):
            mock_response = ModelResponse(model_output=None)
            expected_labels = []
            self.assertEqual(get_labels_from_response(mock_response), expected_labels)

        # Test case 4: JSON contains empty list
        with self.subTest(name="empty_json_list"):
            mock_json_output = "[]"
            mock_response = ModelResponse(
                model_output=[f"```json{mock_json_output}```"]
            )
            expected_labels = []
            self.assertEqual(get_labels_from_response(mock_response), expected_labels)

        # Test case 5: JSON with incorrect format (missing 'label' key)
        with self.subTest(name="incorrect_json_format"):
            mock_json_output = '[{"id": "s1", "value": "summary1"}]'
            mock_response = ModelResponse(
                model_output=[f"```json{mock_json_output}```"]
            )
            with self.assertRaises(KeyError):
                get_labels_from_response(mock_response)

        # Test case 6: JSON contains single label dict (not in a list)
        with self.subTest(name="single_label_dict"):
            mock_json_output = '{"id": "s1", "label": "summary1"}'
            mock_response = ModelResponse(
                model_output=[f"```json{mock_json_output}```"]
            )
            expected_labels = [Label(id="s1", label="summary1")]
            self.assertEqual(get_labels_from_response(mock_response), expected_labels)

    def test_get_formatted_spans_list(self):
        # Test case 1: Multiple spans
        with self.subTest(name="multiple_spans"):
            span1 = LumiSpan(id="s1", text="Hello", inner_tags=[])
            span2 = LumiSpan(id="s2", text="World", inner_tags=[])
            spans = [span1, span2]
            expected_list = [
                "{ id: s1, text: Hello}",
                "{ id: s2, text: World}",
            ]
            self.assertEqual(get_formatted_spans_list(spans), expected_list)

        # Test case 2: Single span
        with self.subTest(name="single_span"):
            span1 = LumiSpan(id="s1", text="Single", inner_tags=[])
            spans = [span1]
            expected_list = [
                "{ id: s1, text: Single}",
            ]
            self.assertEqual(get_formatted_spans_list(spans), expected_list)

        # Test case 3: Empty list of spans
        with self.subTest(name="empty_spans_list"):
            spans = []
            expected_list = []
            self.assertEqual(get_formatted_spans_list(spans), expected_list)

    def test_get_all_spans_from_doc(self):
        # Setup a complex LumiDoc
        span1 = LumiSpan(id="s1", text="This is text.", inner_tags=[])
        span2 = LumiSpan(id="s2", text="This is a list item.", inner_tags=[])
        span3 = LumiSpan(id="s3", text="This is a sublist item.", inner_tags=[])
        span4 = LumiSpan(id="s4", text="Another text span.", inner_tags=[])
        span5 = LumiSpan(id="s5", text="This is a sub-section span.", inner_tags=[])

        doc = LumiDoc(
            markdown="",
            concepts=[],
            sections=[
                LumiSection(
                    id="sec1",
                    heading=Heading(heading_level=1, text="Section 1"),
                    contents=[
                        LumiContent(
                            id="c1",
                            text_content=TextContent(spans=[span1], tag_name="p"),
                        ),
                        LumiContent(
                            id="c2",
                            list_content=ListContent(
                                is_ordered=False,
                                list_items=[
                                    ListItem(
                                        spans=[span2],
                                        subListContent=ListContent(
                                            is_ordered=False,
                                            list_items=[ListItem(spans=[span3])],
                                        ),
                                    )
                                ],
                            ),
                        ),
                        LumiContent(
                            id="c3",
                            text_content=TextContent(spans=[span4], tag_name="p"),
                        ),
                    ],
                    sub_sections=[
                        LumiSection(
                            id="subsec1",
                            heading=Heading(heading_level=2, text="Sub-section 1"),
                            contents=[
                                LumiContent(
                                    id="c4",
                                    text_content=TextContent(
                                        spans=[span5], tag_name="p"
                                    ),
                                )
                            ],
                        )
                    ],
                )
            ],
        )

        # Test case 1: Extract all spans
        with self.subTest(name="extract_all"):
            extracted_spans = get_all_spans_from_doc(doc)
            self.assertEqual(len(extracted_spans), 5)
            self.assertIn(span1, extracted_spans)
            self.assertIn(span2, extracted_spans)
            self.assertIn(span3, extracted_spans)
            self.assertIn(span4, extracted_spans)
            self.assertIn(span5, extracted_spans)

        # Test case 2: Empty document
        with self.subTest(name="empty_doc"):
            empty_doc = LumiDoc(sections=[], concepts=[], markdown="")
            self.assertEqual(get_all_spans_from_doc(empty_doc), [])
