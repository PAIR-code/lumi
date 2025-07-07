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


# prompt_utils.py

import json
from typing import Any, Dict, List, Sequence

from shared.lumi_doc import LumiSpan, Label, LumiDoc
from shared.string_utils import extract_json_from_decorator


class ModelResponse:
    def __init__(self, model_output: Sequence[str] | None):
        self.model_output = model_output


def get_json_from_response(
    response: ModelResponse,
) -> dict[str, Any] | List[dict[str, Any]]:
    """Gets json from a response."""
    if response.model_output is None or not response.model_output:
        return {}
    stripped_response = extract_json_from_decorator(response.model_output[0])
    try:
        response = json.loads(stripped_response)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON response:[start] {stripped_response}[end]")
        return {}
    return response


def get_labels_from_response(
    response: ModelResponse,
) -> List[Label]:
    """Gets labels from a response."""
    if response.model_output is None or not response.model_output:
        return []

    labels = get_json_from_response(response)
    if labels:
        if not isinstance(labels, list):
            labels = [labels]
        labels = [Label(id=label["id"], label=label["label"]) for label in labels]
        return labels
    return []


def get_formatted_spans_list(
    spans: List[LumiSpan],
) -> List[str]:
    """Generates a string of the spans."""
    formatted_spans = [
        "{{ id: {id}, text: {text}}}".format(id=span.id, text=span.text)
        for span in spans
    ]
    return formatted_spans


def _extract_spans_from_list(list_content) -> List[LumiSpan]:
    spans: List[LumiSpan] = []
    for item in list_content.list_items:
        spans.extend(item.spans)
        if item.subListContent:
            spans.extend(_extract_spans_from_list(item.subListContent))
    return spans


def get_all_spans_from_doc(document: LumiDoc) -> List[LumiSpan]:
    """Extracts all LumiSpan objects from a LumiDoc by iterating through its contents."""
    all_spans = []
    for section in document.sections:
        for content in section.contents:
            if content.text_content:
                all_spans.extend(content.text_content.spans)
            elif content.list_content:
                all_spans.extend(_extract_spans_from_list(content.list_content))
    return all_spans
