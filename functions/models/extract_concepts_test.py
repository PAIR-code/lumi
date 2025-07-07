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
from unittest.mock import patch
from models import extract_concepts
from shared.lumi_doc import LumiConcept, ConceptContent


VALID_CONCEPTS_OBJECT = extract_concepts.LLMResponseSchema(
    concepts=[
        extract_concepts.LLMExtractedConcept(
            name="Large Language Models",
            contents=[
                ConceptContent(
                    label="description",
                    value="Advanced AI models capable of understanding and generating human language.",
                )
            ],
        ),
        extract_concepts.LLMExtractedConcept(
            name="Semantic Search",
            contents=[
                ConceptContent(
                    label="description",
                    value="A search technique that understands the meaning and context of queries.",
                )
            ],
        ),
    ]
)


class TestExtractConcepts(unittest.TestCase):
    def test_parse_lumi_concepts(self):
        with self.subTest("extract valid concepts"):
            expected_concepts = [
                LumiConcept(
                    id="concept-0",
                    name="Large Language Models",
                    contents=[
                        ConceptContent(
                            label="description",
                            value="Advanced AI models capable of understanding and generating human language.",
                        )
                    ],
                    in_text_citations=[],
                ),
                LumiConcept(
                    id="concept-1",
                    name="Semantic Search",
                    contents=[
                        ConceptContent(
                            label="description",
                            value="A search technique that understands the meaning and context of queries.",
                        )
                    ],
                    in_text_citations=[],
                ),
            ]
            actual_concepts = extract_concepts.parse_lumi_concepts(
                VALID_CONCEPTS_OBJECT
            )

            self.assertEqual(len(expected_concepts), len(actual_concepts))
            for i in range(len(expected_concepts)):
                self.assertEqual(expected_concepts[i], actual_concepts[i])

        with self.subTest("empty concepts list"):
            expected_concepts = []
            actual_concepts = extract_concepts.parse_lumi_concepts(
                extract_concepts.LLMResponseSchema(concepts=[])
            )
            self.assertEqual(expected_concepts, actual_concepts)

        with self.subTest("None input"):
            expected_concepts = []
            actual_concepts = extract_concepts.parse_lumi_concepts(None)
            self.assertEqual(expected_concepts, actual_concepts)


if __name__ == "__main__":
    unittest.main()
