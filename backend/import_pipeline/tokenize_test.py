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

from shared.lumi_doc import InnerTag, InnerTagName, Position

from import_pipeline import tokenize


class TokenizeTest(unittest.TestCase):
    def test_tokenize_sentences_no_math(self):
        """
        Tests standard sentence tokenization without math blocks.
        """
        text = "This is the first sentence. This is the second."
        expected_sentences = [
            "This is the first sentence.",
            "This is the second.",
        ]
        result = tokenize.tokenize_sentences(text, [])
        self.assertEqual(result, expected_sentences)

    def test_rejoin_split_math_sentences(self):
        """
        Tests rejoining a math block that NLTK incorrectly splits.
        """
        text = "This is a sentence with a math block E = m.c^2. It continues here. This is the final sentence."
        # NLTK splits at the period inside the math block:
        # ['This is a sentence with a math block $E = m.c^2.', 'It continues here$.', 'This is the final sentence.']
        math_tags = [
            InnerTag(
                id="123",
                tag_name=InnerTagName.MATH,
                metadata={},
                position=Position(start_index=34, end_index=65),
                children=[],
            )
        ]
        expected_sentences = [
            "This is a sentence with a math block E = m.c^2. It continues here.",
            "This is the final sentence.",
        ]
        result = tokenize.tokenize_sentences(text, math_tags)
        self.assertEqual(result, expected_sentences)

    def test_tokenize_sentences_with_multiple_math_blocks(self):
        """
        Tests handling of multiple, non-overlapping math blocks.
        """
        text = "First sentence. A math block a.b and another c.d. Last sentence."
        math_tags = [
            InnerTag(
                id="123",
                tag_name=InnerTagName.MATH,
                position=Position(start_index=29, end_index=31),
                metadata={},
                children=[],
            ),
            InnerTag(
                id="123",
                tag_name=InnerTagName.MATH,
                position=Position(start_index=44, end_index=46),
                metadata={},
                children=[],
            ),
        ]
        expected_sentences = [
            "First sentence.",
            "A math block a.b and another c.d.",
            "Last sentence.",
        ]
        result = tokenize.tokenize_sentences(text, math_tags)
        self.assertEqual(result, expected_sentences)


if __name__ == "__main__":
    unittest.main()
