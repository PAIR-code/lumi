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
from shared.lumi_doc import (
    LumiConcept,
    ConceptContent,
    LumiSpan,
    InnerTagName,
)


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


class TestAnnotateConceptsInPlace(unittest.TestCase):
    def test_annotates_single_concept(self):
        """Tests that a single concept is correctly identified and tagged."""
        spans = [
            LumiSpan(
                id="s1",
                text="This paper is about Large Language Models.",
                inner_tags=[],
            )
        ]
        concepts = [
            LumiConcept(
                id="c1", name="Large Language Models", contents=[], in_text_citations=[]
            )
        ]

        extract_concepts.annotate_concepts_in_place(spans, concepts)

        self.assertEqual(len(spans[0].inner_tags), 1)
        tag = spans[0].inner_tags[0]
        self.assertEqual(tag.tag_name, InnerTagName.CONCEPT)
        self.assertEqual(tag.metadata["concept_id"], "c1")
        self.assertEqual(tag.position.start_index, 20)
        self.assertEqual(tag.position.end_index, 41)

    def test_annotates_multiple_concepts_and_spans(self):
        """Tests annotation across multiple spans and with multiple concepts."""
        spans = [
            LumiSpan(id="s1", text="We use Semantic Search.", inner_tags=[]),
            LumiSpan(
                id="s2",
                text="The future is Large Language Models.",
                inner_tags=[],
            ),
        ]
        concepts = [
            LumiConcept(
                id="c1", name="Large Language Models", contents=[], in_text_citations=[]
            ),
            LumiConcept(
                id="c2", name="Semantic Search", contents=[], in_text_citations=[]
            ),
        ]

        extract_concepts.annotate_concepts_in_place(spans, concepts)

        # Check first span
        self.assertEqual(len(spans[0].inner_tags), 1)
        tag1 = spans[0].inner_tags[0]
        self.assertEqual(tag1.metadata["concept_id"], "c2")
        self.assertEqual(tag1.position.start_index, 7)
        self.assertEqual(tag1.position.end_index, 22)

        # Check second span
        self.assertEqual(len(spans[1].inner_tags), 1)
        tag2 = spans[1].inner_tags[0]
        self.assertEqual(tag2.metadata["concept_id"], "c1")
        self.assertEqual(tag2.position.start_index, 14)
        self.assertEqual(tag2.position.end_index, 35)

    def test_no_concept_in_text(self):
        """Tests that no tags are added if the concept name is not in the text."""
        spans = [LumiSpan(id="s1", text="This is a simple sentence.", inner_tags=[])]
        concepts = [
            LumiConcept(
                id="c1", name="Nonexistent Concept", contents=[], in_text_citations=[]
            )
        ]

        extract_concepts.annotate_concepts_in_place(spans, concepts)

        self.assertEqual(len(spans[0].inner_tags), 0)


if __name__ == "__main__":
    unittest.main()
