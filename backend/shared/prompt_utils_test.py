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

from shared.lumi_doc import (
    FigureContent,
    Heading,
    HtmlFigureContent,
    ImageContent,
    Label,
    ListContent,
    ListItem,
    LumiAbstract,
    LumiContent,
    LumiDoc,
    LumiFootnote,
    LumiReference,
    LumiSection,
    LumiSpan,
    TextContent,
)
from shared.prompt_utils import (
    ModelResponse,
    get_all_spans_from_doc,
    get_formatted_spans_list,
    get_json_from_response,
    get_labels_from_response,
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
        span_abstract = LumiSpan(id="s_abs", text="Abstract text.", inner_tags=[])
        span_ref = LumiSpan(id="s_ref", text="Reference text.", inner_tags=[])
        span_foot = LumiSpan(id="s_foot", text="Footnote text.", inner_tags=[])
        span_img_caption = LumiSpan(
            id="s_img_cap", text="Image caption.", inner_tags=[]
        )
        span_fig_caption = LumiSpan(
            id="s_fig_cap", text="Figure caption.", inner_tags=[]
        )
        span_html_caption = LumiSpan(
            id="s_html_cap", text="HTML caption.", inner_tags=[]
        )

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
                        LumiContent(
                            id="c_img",
                            image_content=ImageContent(
                                storage_path="",
                                latex_path="",
                                alt_text="",
                                width=0,
                                height=0,
                                caption=span_img_caption,
                            ),
                        ),
                        LumiContent(
                            id="c_fig",
                            figure_content=FigureContent(
                                images=[], caption=span_fig_caption
                            ),
                        ),
                        LumiContent(
                            id="c_html",
                            html_figure_content=HtmlFigureContent(
                                html="", caption=span_html_caption
                            ),
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
            abstract=LumiAbstract(
                contents=[
                    LumiContent(
                        id="c_abs",
                        text_content=TextContent(spans=[span_abstract], tag_name="p"),
                    )
                ]
            ),
            references=[LumiReference(id="ref1", span=span_ref)],
            footnotes=[LumiFootnote(id="fn1", span=span_foot)],
        )

        # Test case 1: Extract all spans
        with self.subTest(name="extract_all"):
            extracted_spans = get_all_spans_from_doc(doc)
            self.assertEqual(len(extracted_spans), 11)
            expected_spans = [
                span1,
                span2,
                span3,
                span4,
                span_img_caption,
                span_fig_caption,
                span_html_caption,
                span5,
                span_abstract,
                span_ref,
                span_foot,
            ]
            for span in expected_spans:
                self.assertIn(span, extracted_spans)

        # Test case 2: Empty document
        with self.subTest(name="empty_doc"):
            empty_doc = LumiDoc(sections=[], concepts=[], markdown="")
            self.assertEqual(get_all_spans_from_doc(empty_doc), [])

        # Test case 3: Document with only abstract
        with self.subTest(name="only_abstract"):
            doc_only_abstract = LumiDoc(
                markdown="",
                concepts=[],
                sections=[],
                abstract=LumiAbstract(
                    contents=[
                        LumiContent(
                            id="c_abs",
                            text_content=TextContent(
                                spans=[span_abstract], tag_name="p"
                            ),
                        )
                    ]
                ),
            )
            extracted = get_all_spans_from_doc(doc_only_abstract)
            self.assertEqual(len(extracted), 1)
            self.assertIn(span_abstract, extracted)
