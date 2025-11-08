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
"""Script to test the answers.py generation logic locally."""

import argparse
import os
import sys

# Add the project root to sys.path to allow imports like 'import_pipeline.summaries'
script_dir = os.path.dirname(__file__)
# Assuming project root is one levels up from this script:
project_root = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.insert(0, project_root)


from answers.answers import generate_lumi_answer  # noqa: E402
from shared.api import LumiAnswerRequest  # noqa: E402
from shared.lumi_doc import (  # noqa: E402
    Heading,
    LumiContent,
    LumiDoc,
    LumiSection,
    LumiSpan,
    TextContent,
)


def create_dummy_doc() -> LumiDoc:
    """Creates a hardcoded LumiDoc for testing."""
    span1 = LumiSpan(
        id="s1",
        text="Gemini is a family of multimodal models developed by Google.",
        inner_tags=[],
    )
    span2 = LumiSpan(
        id="s2", text="It was announced on December 6, 2023.", inner_tags=[]
    )
    span3 = LumiSpan(
        id="s3",
        text="The family includes Gemini Ultra, Gemini Pro, and Gemini Nano.",
        inner_tags=[],
    )
    span4 = LumiSpan(
        id="s4", text="Lumi is an experimental AI reading app.", inner_tags=[]
    )

    doc = LumiDoc(
        markdown="",
        concepts=[],
        sections=[
            LumiSection(
                id="sec1",
                heading=Heading(heading_level=1, text="About Gemini"),
                contents=[
                    LumiContent(
                        id="c1",
                        text_content=TextContent(tag_name="p", spans=[span1, span2]),
                    ),
                    LumiContent(
                        id="c2", text_content=TextContent(tag_name="p", spans=[span3])
                    ),
                ],
            ),
            LumiSection(
                id="sec2",
                heading=Heading(heading_level=1, text="About Lumi"),
                contents=[
                    LumiContent(
                        id="c3", text_content=TextContent(tag_name="p", spans=[span4])
                    )
                ],
            ),
        ],
    )
    return doc


def main():
    """Main function to run the script."""
    parser = argparse.ArgumentParser(
        description="Test the Lumi answer generation logic."
    )
    parser.add_argument("--query", type=str, help="The user's query.")
    parser.add_argument("--highlight", type=str, help="The highlighted text.")

    args = parser.parse_args()

    if not args.query and not args.highlight:
        print("Error: You must provide either --query or --highlight.")
        return

    # Create a dummy LumiDoc for testing
    doc = create_dummy_doc()
    print("Using a dummy document for context...")

    request = LumiAnswerRequest(query=args.query, highlight=args.highlight)

    print("Generating answer...")
    lumi_answer = generate_lumi_answer(doc, request)

    print("\n" + "=" * 20 + " RESULT " + "=" * 20)
    print(f"Request Query: {lumi_answer.request.query}")
    print(f"Request Highlight: {lumi_answer.request.highlight}")
    print("\nResponse:")
    for content in lumi_answer.response_content:
        for span in content.text_content.spans:
            print(f"  Span Text: {span.text}")
            if span.inner_tags:
                print("  Inner Tags:")
                for tag in span.inner_tags:
                    print(f"    - {tag.tag_name.value}: {tag.metadata}")

    print("=" * 48 + "\n")


if __name__ == "__main__":
    main()
