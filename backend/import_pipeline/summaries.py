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

# summaries.py
"""Preprocessing functions for Lumi."""

from dataclasses import dataclass

import llm_models.llm as llm
from pydantic import BaseModel
from shared import prompt_utils
from shared.lumi_doc import (
    ListContent,
    LumiContent,
    LumiDoc,
    LumiSection,
    LumiSpan,
    LumiSummaries,
    LumiSummary,
)
from shared.utils import get_unique_id

from import_pipeline.convert_html_to_lumi import (
    convert_raw_output_to_spans,
)


@dataclass
class FetchLumiSummariesRequestOptions:
    include_section_summaries: bool = False
    include_content_summaries: bool = False
    include_span_summaries: bool = False
    include_abstract_excerpt: bool = False


# These are Pydantic BaseModels used to specify structured output to Gemini
class AbstractExcerptSchema(BaseModel):
    id: str


class LabelSchema(BaseModel):
    id: str
    label: str


MIN_CHARACTER_LENGTH = 100

SPAN_SUMMARIES_DEFAULT_BATCH_SIZE = 500
SECTION_SUMMARIES_DEFAULT_BATCH_SIZE = 50
CONTENT_SUMMARIES_DEFAULT_BATCH_SIZE = 100

# Shared prompt instructions
_PROMPT_FORMATTING_INSTRUCTIONS = """You can use markdown for formatting, like <b>bold</b>. For any equations or variables, make sure to use $...$ for any inline math (including \\sqrt)."""
_PROMPT_JSON_OUTPUT_INSTRUCTIONS = """Please return the list of items and their summaries as a list of JSON objects, each with two fields: id (string) and label (string). Please use double quotes around the key/values and single quotes within the strings."""


def _create_summary_span(raw_label: str) -> LumiSpan:
    """Parses a raw string label, potentially with formatting, into a LumiSpan."""
    spans = convert_raw_output_to_spans(raw_label, skip_tokenize=True)
    if spans:
        return spans[0]

    return LumiSpan(
        id=get_unique_id(),
        text=raw_label,
        inner_tags=[],
    )


def generate_lumi_summaries(
    document: LumiDoc,
    options: FetchLumiSummariesRequestOptions = FetchLumiSummariesRequestOptions(
        include_content_summaries=True,
        include_section_summaries=True,
        include_span_summaries=True,
        include_abstract_excerpt=True,
    ),
) -> LumiSummaries:
    """Generates Lumi summaries."""
    lumi_summaries = LumiSummaries(
        section_summaries=[], content_summaries=[], span_summaries=[]
    )

    if options.include_section_summaries:
        section_summaries = generate_section_summaries(document)
        lumi_summaries.section_summaries.extend(section_summaries)

    if options.include_content_summaries:
        content_summaries = generate_content_summaries(document)
        lumi_summaries.content_summaries.extend(content_summaries)

    if options.include_span_summaries:
        span_summaries = generate_span_summaries(document)
        lumi_summaries.span_summaries.extend(span_summaries)

    if options.include_abstract_excerpt and document.abstract:
        abstract_excerpt_span_id = _select_abstract_excerpt(document)
        lumi_summaries.abstract_excerpt_span_id = abstract_excerpt_span_id

    return lumi_summaries


def _get_all_spans_from_doc(document: LumiDoc) -> list[LumiSpan]:
    """Extracts all LumiSpan objects from a LumiDoc by iterating through its contents."""
    all_spans = []

    def _collect_spans_recursive(sections: list[LumiSection]):
        for section in sections:
            for content in section.contents:
                all_spans.extend(_get_spans_from_content(content))
            if section.sub_sections:
                _collect_spans_recursive(section.sub_sections)

    _collect_spans_recursive(document.sections)
    return all_spans


def _get_spans_from_content(content: LumiContent) -> list[LumiSpan]:
    """Extracts all LumiSpan objects from a LumiContent block."""
    content_spans = []
    if content.text_content:
        content_spans.extend(content.text_content.spans)
    elif content.list_content:

        def extract_spans_from_list(list_content: ListContent) -> list[LumiSpan]:
            spans: list[LumiSpan] = []
            for item in list_content.list_items:
                spans.extend(item.spans)
                if item.subListContent:
                    spans.extend(extract_spans_from_list(item.subListContent))
            return spans

        content_spans.extend(extract_spans_from_list(content.list_content))
    return content_spans


def _get_text_from_content(content: LumiContent) -> str:
    """Gets the concatenated text from all spans within a LumiContent."""
    spans = _get_spans_from_content(content)
    return " ".join(span.text for span in spans)


def _get_text_from_section(section: LumiSection) -> str:
    """Gets the concatenated text from all spans within a LumiSection, including sub-sections."""
    all_text = []
    for content in section.contents:
        all_text.append(_get_text_from_content(content))
    if section.sub_sections:
        for sub_section in section.sub_sections:
            all_text.append(_get_text_from_section(sub_section))
    return " ".join(all_text)


# ------------------------------------------------------------------------------
# Abstract Excerpt
# ------------------------------------------------------------------------------
def _select_abstract_excerpt_prompt(spans: list[LumiSpan]) -> str:
    """Generates a prompt to select the most important sentence from an abstract."""
    formatted_spans = prompt_utils.get_formatted_spans_list(spans)
    spans_string = "\n".join(formatted_spans)
    prompt = f"""You will be given the sentences from a document's abstract. Your task is to identify the single most important sentence that best summarizes the core contribution or finding of the paper.
Here are the sentences:
{spans_string}

Please return only the 'id' of the most important sentence as a JSON object with a single key "id". For example: {{"id": "s123"}}.
"""
    return prompt


def _select_abstract_excerpt(document: LumiDoc) -> str | None:
    """Identifies the most important sentence from the abstract."""
    if not document.abstract:
        return None

    abstract_spans: list[LumiSpan] = []
    for content in document.abstract.contents:
        abstract_spans.extend(_get_spans_from_content(content))

    if not abstract_spans:
        return None

    prompt = _select_abstract_excerpt_prompt(abstract_spans)
    response = llm.call_predict_with_schema(
        prompt, response_schema=AbstractExcerptSchema
    )

    # Handle union type: response could be AbstractExcerptSchema | list[AbstractExcerptSchema] | None
    if response:
        if isinstance(response, list):
            if response and response[0].id:
                return response[0].id
            print("Failed to generate abstract excerpt response.")
            return None
        elif hasattr(response, "id") and response.id:
            return response.id
        else:
            print("Failed to generate abstract excerpt response.")
            return None
    else:
        print("Failed to generate abstract excerpt response.")
        return None


# ------------------------------------------------------------------------------
# Span summaries.
# ------------------------------------------------------------------------------
def _generate_span_summaries_prompt(spans: list[LumiSpan]) -> str:
    """Generates a prompt for sentence labels."""
    formatted_spans = prompt_utils.get_formatted_spans_list(spans)

    spans_string = "\n".join(formatted_spans)
    prompt = f"""You will be given a list of sentences! Your task is to label each sentence in 1-6 words or less, being as specific as possible. {_PROMPT_FORMATTING_INSTRUCTIONS}
Here are the sentences:
{spans_string}

Try to use as specific words as possible. Adjacent sentences that are related can be given the same label if it makes sense.

{_PROMPT_JSON_OUTPUT_INSTRUCTIONS}
           """
    return prompt


def generate_span_summaries(
    document: LumiDoc,
    batch_size: int = SPAN_SUMMARIES_DEFAULT_BATCH_SIZE,
) -> list[LumiSummary]:
    """Generates sentence labels."""
    spans = _get_all_spans_from_doc(document)
    all_summaries: list[LumiSummary] = []

    prompts = []
    for i in range(0, len(spans), batch_size):
        sentences = spans[i : i + batch_size]
        prompt = _generate_span_summaries_prompt(sentences)
        prompts.append(prompt)

    for prompt in prompts:
        schema_labels = llm.call_predict_with_schema(
            prompt, response_schema=list[LabelSchema]
        )
        if schema_labels:
            # Handle union type: schema_labels could be list[LabelSchema] | list[list[LabelSchema]] | None
            labels_list: list[LabelSchema] = []
            if isinstance(schema_labels, list) and schema_labels:
                # Check if first element is a list to determine if nested
                first_item = schema_labels[0]
                if isinstance(first_item, list):
                    # Flatten nested list: schema_labels is list[list[LabelSchema]]
                    for sublist in schema_labels:
                        if isinstance(sublist, list):
                            labels_list.extend(sublist)
                else:
                    # schema_labels is list[LabelSchema] - use cast to help mypy
                    from typing import cast

                    labels_list = cast(list[LabelSchema], schema_labels)
            # Convert from List[LabelSchema] to List[LumiSummary]
            summaries = [
                LumiSummary(id=sl.id, summary=_create_summary_span(sl.label))
                for sl in labels_list
            ]
            all_summaries.extend(summaries)
        else:
            print("Failed to parse JSON response for span summaries.")
            continue

    return all_summaries


# ------------------------------------------------------------------------------
# Section summaries.
# ------------------------------------------------------------------------------
def _get_all_sections_with_text(document: LumiDoc) -> list[dict[str, str]]:
    """Recursively collects all sections and their text from a LumiDoc."""
    section_data = []

    def _collect_recursive(sections: list[LumiSection]):
        for section in sections:
            section_data.append(
                {"id": section.id, "text": _get_text_from_section(section)}
            )
            if section.sub_sections:
                _collect_recursive(section.sub_sections)

    _collect_recursive(document.sections)
    return section_data


def _generate_section_summaries_prompt(section_data: list[dict[str, str]]) -> str:
    """Generates a prompt for section labels."""
    section_strings = [
        "{{ id: {id}, text: {text}}}".format(id=s["id"], text=s["text"])
        for s in section_data
        if len(s["text"]) > MIN_CHARACTER_LENGTH
    ]
    section_string = "\n".join(section_strings)
    prompt = f"""You will be given a section of a document! Your task is to summarize each section in 4-16 words, being as specific as possible. {_PROMPT_FORMATTING_INSTRUCTIONS}
Here are the contents:
{section_string}

{_PROMPT_JSON_OUTPUT_INSTRUCTIONS}
"""
    return prompt


def generate_section_summaries(
    document: LumiDoc,
    batch_size: int = SECTION_SUMMARIES_DEFAULT_BATCH_SIZE,
) -> list[LumiSummary]:
    """Generates section labels."""
    all_summaries: list[LumiSummary] = []
    all_sections_data = _get_all_sections_with_text(document)

    for i in range(0, len(all_sections_data), batch_size):
        batch_data = all_sections_data[i : i + batch_size]
        prompt = _generate_section_summaries_prompt(batch_data)
        schema_labels = llm.call_predict_with_schema(
            prompt, response_schema=list[LabelSchema]
        )

        if schema_labels:
            # Handle union type: schema_labels could be list[LabelSchema] | list[list[LabelSchema]] | None
            labels_list: list[LabelSchema] = []
            if isinstance(schema_labels, list) and schema_labels:
                # Check if first element is a list to determine if nested
                first_item = schema_labels[0]
                if isinstance(first_item, list):
                    # Flatten nested list: schema_labels is list[list[LabelSchema]]
                    for sublist in schema_labels:
                        if isinstance(sublist, list):
                            labels_list.extend(sublist)
                else:
                    # schema_labels is list[LabelSchema] - use cast to help mypy
                    from typing import cast

                    labels_list = cast(list[LabelSchema], schema_labels)
            # Convert from List[LabelSchema] to List[LumiSummary]
            summaries = [
                LumiSummary(id=sl.id, summary=_create_summary_span(sl.label))
                for sl in labels_list
            ]
            all_summaries.extend(summaries)
        else:
            print("Failed to parse JSON response for section summaries.")
            continue
    return all_summaries


# ------------------------------------------------------------------------------
# Content summaries.
# ------------------------------------------------------------------------------
def _get_all_contents_with_text(document: LumiDoc) -> list[dict[str, str]]:
    """Recursively collects all content blocks and their text from a LumiDoc."""
    content_data = []

    def _collect_recursive(sections: list[LumiSection]):
        for section in sections:
            for content in section.contents:
                if content.text_content or content.list_content:
                    content_data.append(
                        {"id": content.id, "text": _get_text_from_content(content)}
                    )
            if section.sub_sections:
                _collect_recursive(section.sub_sections)

    _collect_recursive(document.sections)
    return content_data


def _get_generate_content_summaries_prompt(content_data: list[dict[str, str]]) -> str:
    """Generates a prompt for content labels."""
    content_strings = [
        "{{ id: {id}, text: {text}}}".format(id=c["id"], text=c["text"])
        for c in content_data
        if len(c["text"]) > MIN_CHARACTER_LENGTH
    ]
    content_string = "\n".join(content_strings)
    prompt = f"""You will be given a list of content! Your task is to summarize each piece of content in 4-16 words, being as specific as possible. {_PROMPT_FORMATTING_INSTRUCTIONS}
Here are the contents:
{content_string}

Try to bold the important words/concepts in the summary.

{_PROMPT_JSON_OUTPUT_INSTRUCTIONS}
"""
    return prompt


def generate_content_summaries(
    document: LumiDoc,
    batch_size: int = CONTENT_SUMMARIES_DEFAULT_BATCH_SIZE,
) -> list[LumiSummary]:
    """Generates content labels."""
    all_summaries: list[LumiSummary] = []
    all_contents_data = _get_all_contents_with_text(document)

    for i in range(0, len(all_contents_data), batch_size):
        batch_data = all_contents_data[i : i + batch_size]
        prompt = _get_generate_content_summaries_prompt(batch_data)
        schema_labels = llm.call_predict_with_schema(
            prompt, response_schema=list[LabelSchema]
        )

        if schema_labels:
            # Handle union type: schema_labels could be list[LabelSchema] | list[list[LabelSchema]] | None
            labels_list: list[LabelSchema] = []
            if isinstance(schema_labels, list) and schema_labels:
                # Check if first element is a list to determine if nested
                first_item = schema_labels[0]
                if isinstance(first_item, list):
                    # Flatten nested list: schema_labels is list[list[LabelSchema]]
                    for sublist in schema_labels:
                        if isinstance(sublist, list):
                            labels_list.extend(sublist)
                else:
                    # schema_labels is list[LabelSchema] - use cast to help mypy
                    from typing import cast

                    labels_list = cast(list[LabelSchema], schema_labels)
            # Convert from List[LabelSchema] to List[LumiSummary]
            summaries = [
                LumiSummary(id=sl.id, summary=_create_summary_span(sl.label))
                for sl in labels_list
            ]
            all_summaries.extend(summaries)
        else:
            print("Failed to parse JSON response for content summaries.")
            continue

    return all_summaries
