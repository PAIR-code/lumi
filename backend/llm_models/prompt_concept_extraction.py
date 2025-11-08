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
from shared.constants import (
    CONCEPT_CONTENT_LABEL_DEFINITION,
    CONCEPT_CONTENT_LABEL_RELEVANCE,
)

CONCEPT_EXTRACTION_PROMPT = f"""You are an expert academic assistant tasked with extracting key concepts and terms
    from research paper abstracts. For each concept, provide its name and two content items:
    1. A general definition of the concept.
    2. Its specific relevance to the provided abstract.

    Your output MUST be a JSON object with a single key 'concepts', which contains
    a list of concept objects. Each concept object must have 'name' and 'contents'.
    The 'contents' field should be a list of two objects.

    - The first content object MUST have a `label` of "{CONCEPT_CONTENT_LABEL_DEFINITION}" and a `value` containing a concise, general definition of the concept (8-16 words).
    - The second content object MUST have a `label` of "{CONCEPT_CONTENT_LABEL_RELEVANCE}" and a `value` explaining why this concept is important in the context of this specific paper.

    DO NOT include 'id' or 'in_text_citations' in your JSON output; these will be
    handled by the downstream parsing script.

    Example JSON output structure:
    {{
      "concepts": [
        {{
          "name": "Large Language Models",
          "contents": [
            {{
              "label": "{CONCEPT_CONTENT_LABEL_DEFINITION}",
              "value": "Advanced AI models capable of understanding and generating human language."
            }},
            {{
              "label": "{CONCEPT_CONTENT_LABEL_RELEVANCE}",
              "value": "This paper uses Large Language Models to develop a new method for semantic search."
            }}
          ]
        }},
        {{
          "name": "Semantic Search",
          "contents": [
            {{
              "label": "{CONCEPT_CONTENT_LABEL_DEFINITION}",
              "value": "A search technique that understands the meaning and context of queries."
            }},
            {{
              "label": "{CONCEPT_CONTENT_LABEL_RELEVANCE}",
              "value": "The core contribution of this work is a novel semantic search algorithm."
            }}
          ]
        }}
      ]
    }}
"""


def make_concept_extraction_prompt(abstract: str):
    return f"{CONCEPT_EXTRACTION_PROMPT}\n\nHere is the abstract: {abstract}"
