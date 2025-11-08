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
from collections.abc import Sequence
from typing import Any, cast

from shared.lumi_doc import Label, LumiContent, LumiDoc, LumiSpan
from shared.string_utils import extract_json_from_decorator


class ModelResponse:
    def __init__(self, model_output: Sequence[str] | None):
        self.model_output = model_output


def get_json_from_response(
    response: ModelResponse,
) -> dict[str, Any] | list[dict[str, Any]]:
    """Gets json from a response."""
    if response.model_output is None or not response.model_output:
        return {}
    stripped_response = extract_json_from_decorator(response.model_output[0])
    try:
        parsed_response = json.loads(stripped_response)
        # Type cast since json.loads returns Any
        if isinstance(parsed_response, list):
            return cast(list[dict[str, Any]], parsed_response)
        return cast(dict[str, Any], parsed_response)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON response:[start] {stripped_response}[end]")
        return {}


def get_labels_from_response(
    response: ModelResponse,
) -> list[Label]:
    """Gets labels from a response."""
    if response.model_output is None or not response.model_output:
        return []

    labels = get_json_from_response(response)
    if labels:
        if not isinstance(labels, list):
            labels = [labels]
        # After isinstance check, labels is list[dict[str, Any]]
        label_objects = [
            Label(id=label["id"], label=label["label"]) for label in labels
        ]
        return label_objects
    return []


def get_formatted_spans_list(
    spans: list[LumiSpan],
) -> list[str]:
    """Generates a string of the spans."""
    formatted_spans = [f"{{ id: {span.id}, text: {span.text}}}" for span in spans]
    return formatted_spans


def _extract_spans_from_list(list_content) -> list[LumiSpan]:
    spans: list[LumiSpan] = []
    for item in list_content.list_items:
        spans.extend(item.spans)
        if item.subListContent:
            spans.extend(_extract_spans_from_list(item.subListContent))
    return spans


def _extract_spans_from_content(content: LumiContent) -> list[LumiSpan]:
    """Extracts spans from a single LumiContent object."""
    spans: list[LumiSpan] = []
    if content.text_content:
        spans.extend(content.text_content.spans)
    elif content.list_content:
        spans.extend(_extract_spans_from_list(content.list_content))

    # Extract from captions
    if content.image_content and content.image_content.caption:
        spans.append(content.image_content.caption)
    if content.figure_content and content.figure_content.caption:
        spans.append(content.figure_content.caption)
    if content.html_figure_content and content.html_figure_content.caption:
        spans.append(content.html_figure_content.caption)
    return spans


def get_all_spans_from_doc(document: LumiDoc) -> list[LumiSpan]:
    """Extracts all LumiSpan objects from a LumiDoc by iterating through its contents."""
    all_spans: list[LumiSpan] = []

    def _extract_spans_from_sections(sections):
        for section in sections:
            for content in section.contents:
                all_spans.extend(_extract_spans_from_content(content))
            if section.sub_sections:
                _extract_spans_from_sections(section.sub_sections)

    if document.abstract:
        for content in document.abstract.contents:
            all_spans.extend(_extract_spans_from_content(content))

    _extract_spans_from_sections(document.sections)

    if document.references:
        for reference in document.references:
            all_spans.append(reference.span)

    if document.footnotes:
        for footnote in document.footnotes:
            all_spans.append(footnote.span)

    return all_spans
