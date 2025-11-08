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


import copy
import re
from collections.abc import Callable
from typing import Any, cast

from shared import import_tags
from shared.lumi_doc import (
    InnerTag,
    InnerTagName,
    LumiSpan,
    Position,
)
from shared.utils import get_unique_id

from import_pipeline.markdown_utils import postprocess_content_text
from import_pipeline.tokenize import tokenize_sentences


def parse_text_and_extract_inner_tags(raw_content: str) -> tuple[str, list[InnerTag]]:
    """
    Parses raw HTML-like content to extract plain text and InnerTag objects.
    This function is recursive to handle nested tags. The content of tags is
    also parsed, and any inner tags found are added as children to the parent tag.
    """
    cleaned_text_content = ""
    inner_tags = []
    current_position_raw = 0
    current_position_cleaned = 0

    while current_position_raw < len(raw_content):
        earliest_match = None
        earliest_match_tag_definition = None

        # Find the earliest next tag from current_position_raw
        for tag_definition in import_tags.TAG_DEFINITIONS:
            # Type cast needed because dict access returns object type
            pattern = cast(re.Pattern[str], tag_definition["pattern"])
            match = pattern.search(raw_content, current_position_raw)
            if match:
                if earliest_match is None or match.start() < earliest_match.start():
                    earliest_match = match
                    earliest_match_tag_definition = tag_definition

        if earliest_match:
            # Append plain text between current_position_raw and the found tag
            text_before_match = raw_content[
                current_position_raw : earliest_match.start()
            ]
            if text_before_match:
                cleaned_text_content += text_before_match
                current_position_cleaned += len(text_before_match)

            tag_start_index = current_position_cleaned

            # For tags with no content, the group may not exist.
            tag_inner_content_raw = ""
            if "content" in earliest_match.groupdict():
                tag_inner_content_raw = earliest_match.group("content")

            # Recursively parse the content of the tag
            (
                tag_inner_content_cleaned,
                child_tags,
            ) = parse_text_and_extract_inner_tags(tag_inner_content_raw)

            cleaned_text_content += tag_inner_content_cleaned
            current_position_cleaned += len(tag_inner_content_cleaned)
            tag_end_index = current_position_cleaned

            # Type cast needed because dict access returns object type
            metadata_extractor = cast(
                Callable[[re.Match[str]], Any],
                earliest_match_tag_definition["metadata_extractor"],
            )
            metadata = metadata_extractor(earliest_match)

            tag_name = cast(InnerTagName, earliest_match_tag_definition["name"])
            inner_tags.append(
                InnerTag(
                    id=get_unique_id(),
                    tag_name=tag_name,
                    metadata=metadata,
                    position=Position(
                        start_index=tag_start_index, end_index=tag_end_index
                    ),
                    children=child_tags,
                )
            )

            current_position_raw = earliest_match.end()
        else:
            # No tags remaining, append the remaining plain text
            remaining_plain_text = raw_content[current_position_raw:]
            if remaining_plain_text:
                cleaned_text_content += remaining_plain_text
            break

    return cleaned_text_content, inner_tags


def create_lumi_spans(
    cleaned_text: str,
    all_inner_tags: list[InnerTag],
    skip_tokenize=False,
    strip_double_brackets=False,
) -> list[LumiSpan]:
    """
    Splits cleaned_text into sentences and creates LumiSpan objects.
    InnerTag objects (with positions relative to cleaned_text) are distributed
    to their respective sentences, adjusting positions to be sentence-relative.
    If an InnerTag overlaps with multiple sentence, an inner tag is added to both
    other sentences with the positions clamped accordingly.
    """
    lumi_spans: list[LumiSpan] = []

    if not cleaned_text.strip() and not all_inner_tags:
        return []

    sentences = []
    if not skip_tokenize:
        sentences = tokenize_sentences(cleaned_text, all_inner_tags)

    if not sentences or skip_tokenize:
        # If tokenization results in no sentences, but there is text or tags,
        # treat the whole text as a single sentence/span. This can happen for
        # reference entries that don't have standard sentence punctuation.
        if cleaned_text or all_inner_tags:
            lumi_spans.append(
                LumiSpan(
                    id=get_unique_id(),
                    text=postprocess_content_text(
                        cleaned_text, strip_double_brackets=strip_double_brackets
                    ),
                    inner_tags=all_inner_tags,
                )
            )
        return lumi_spans

    cleaned_text_search_offset = 0
    processed_tag_ids: set[str] = set()

    for sentence_text in sentences:
        # Locate the first index of sentence_text within cleaned_text (after the offset)
        sentence_start_in_cleaned = cleaned_text.find(
            sentence_text, cleaned_text_search_offset
        )
        if sentence_start_in_cleaned == -1:
            # Should not happen if sentences are derived from cleaned_text
            continue
        sentence_len = len(sentence_text)

        tags_relative_to_sentence = _adjust_tags_for_sentence(
            all_inner_tags, 0, sentence_start_in_cleaned, sentence_len
        )

        # Track which tags were processed
        for tag in tags_relative_to_sentence:
            processed_tag_ids.add(tag.id)

        lumi_spans.append(
            LumiSpan(
                id=get_unique_id(),
                text=postprocess_content_text(
                    sentence_text, strip_double_brackets=strip_double_brackets
                ),
                inner_tags=tags_relative_to_sentence,
            )
        )
        cleaned_text_search_offset = sentence_start_in_cleaned + sentence_len

    # Handle any tags that were not processed (e.g., tags with no text content at the end)
    # This can happen for self-closing reference tags.
    for tag in all_inner_tags:
        if tag.id not in processed_tag_ids:
            new_tag = copy.deepcopy(tag)
            # Adjust position to be relative to the new empty string
            new_tag.position.start_index = 0
            new_tag.position.end_index = 0
            # Clear any existing children
            new_tag.children = []

            lumi_spans.append(
                LumiSpan(
                    id=get_unique_id(),
                    text="",
                    inner_tags=[new_tag],
                )
            )

    return lumi_spans


def _adjust_tags_for_sentence(
    tags: list[InnerTag],
    parent_absolute_start: int,
    sentence_start_in_cleaned: int,
    sentence_len: int,
) -> list[InnerTag]:
    """Recursively adjusts tags and their children to be relative to a single sentence span."""
    sentence_end_in_cleaned = sentence_start_in_cleaned + sentence_len

    result_tags = []
    for tag in tags:
        tag_absolute_start = parent_absolute_start + tag.position.start_index
        tag_absolute_end = parent_absolute_start + tag.position.end_index

        # Check for overlap
        if (
            tag_absolute_start <= sentence_end_in_cleaned
            and tag_absolute_end >= sentence_start_in_cleaned
        ):
            new_tag = copy.deepcopy(tag)

            # Adjust position to be relative to the sentence
            new_tag.position.start_index = max(
                0, tag_absolute_start - sentence_start_in_cleaned
            )
            new_tag.position.end_index = min(
                sentence_len, tag_absolute_end - sentence_start_in_cleaned
            )

            if new_tag.children:
                # Recurse for children, passing the parent's absolute start position
                new_tag.children = _adjust_tags_for_sentence(
                    new_tag.children,
                    tag_absolute_start,  # Children positions are relative to this new parent tag's start index
                    sentence_start_in_cleaned,
                    sentence_len,
                )
            result_tags.append(new_tag)
    return result_tags
