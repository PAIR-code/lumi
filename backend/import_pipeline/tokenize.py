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
import os

import nltk
from shared.lumi_doc import InnerTag, InnerTagName

nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))
from nltk import tokenize  # noqa: E402

nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))


def _rejoin_split_sentences(
    sentences: list[str], cleaned_text: str, inner_tags: list[InnerTag]
) -> list[str]:
    """
    Rejoins sentences that were incorrectly split inside math blocks.
    This version uses `inner_tags` to robustly identify math environments.

    Args:
        sentences: A list of strings, where each string is a sentence.
        cleaned_text: The original text from which sentences were tokenized.
        inner_tags: A list of InnerTag objects marking special content like math.

    Returns:
        A list of strings with sentences inside math blocks correctly joined.
    """
    if not sentences:
        return []

    math_tags = [
        tag
        for tag in inner_tags
        if tag.tag_name == InnerTagName.MATH
        or tag.tag_name == InnerTagName.MATH_DISPLAY
    ]
    if not math_tags:
        return sentences

    rejoined_sentences = []
    current_sentence_index = 0
    text_offset = 0

    while current_sentence_index < len(sentences):
        current_sentence = sentences[current_sentence_index]
        sentence_start_pos = cleaned_text.find(current_sentence, text_offset)
        if sentence_start_pos == -1:
            # Fallback if sentence not found, though this shouldn't happen.
            rejoined_sentences.append(current_sentence)
            text_offset += len(current_sentence)
            current_sentence_index += 1
            continue

        sentence_end_pos = sentence_start_pos + len(current_sentence)
        text_offset = sentence_end_pos

        merged_sentence = current_sentence
        num_merged = 0

        # Check if any math tag starts in this sentence and ends in a later one.
        for tag in math_tags:
            tag_start = tag.position.start_index
            tag_end = tag.position.end_index

            # A tag spans multiple sentences if it starts within the current merged
            # block and ends after it.
            if (
                sentence_start_pos <= tag_start < sentence_end_pos
                and tag_end > sentence_end_pos
            ):
                # We need to merge subsequent sentences
                next_sentence_index = current_sentence_index + 1
                while sentence_end_pos < tag_end and next_sentence_index < len(
                    sentences
                ):
                    next_sentence = sentences[next_sentence_index]
                    # The space is needed because sent_tokenize strips it.
                    merged_sentence += " " + next_sentence
                    sentence_end_pos += len(next_sentence) + 1
                    num_merged += 1
                    next_sentence_index += 1

        rejoined_sentences.append(merged_sentence)
        current_sentence_index += 1 + num_merged

    return rejoined_sentences


def tokenize_sentences(cleaned_text: str, inner_tags: list[InnerTag]) -> list[str]:
    """
    Tokenizes text into sentences, with special handling for math blocks.

    Args:
        cleaned_text: The text to tokenize.
        inner_tags: A list of InnerTag objects from the document.

    Returns:
        A list of sentences.
    """
    initial_sentences = tokenize.sent_tokenize(cleaned_text)

    rejoined = _rejoin_split_sentences(initial_sentences, cleaned_text, inner_tags)
    return rejoined
