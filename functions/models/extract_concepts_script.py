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

"""Runs concept extraction on a small test abstract and prints results"""

import os
import sys
from typing import List

# Add the project root to sys.path to allow imports like 'models.extract_concepts'
script_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.insert(0, project_root)

from models.extract_concepts import extract_concepts
from shared.lumi_doc import LumiConcept

DUMMY_ABSTRACT = """
Large Language Models (LLMs) are advanced AI models capable of understanding and generating human language.
One key application of LLMs is in semantic search, a technique that understands the meaning and context of queries,
going beyond simple keyword matching. This allows for more relevant and accurate search results.
"""


def print_lumi_concepts(concepts: List[LumiConcept]):
    """Prints the components of a list of LumiConcepts in a readable format."""
    print("\n--- Lumi Concepts Output ---")
    if not concepts:
        print("  No concepts were extracted.")
    else:
        for concept in concepts:
            print(f"\n  Concept ID: {concept.id}")
            print(f"  Name: {concept.name}")
            print("  Contents:")
            for content in concept.contents:
                print(f"    - {content.label}: {content.value}")
    print("----------------------------\n")


if __name__ == "__main__":
    print("Running concept extraction on a dummy abstract...")
    extracted_concepts = extract_concepts(DUMMY_ABSTRACT)
    print("Concept extraction complete.")

    print("Printing extracted concepts:")
    print_lumi_concepts(extracted_concepts)
