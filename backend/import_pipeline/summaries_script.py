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

# summaries_script.py
"""Runs summary generation on a small test document and prints results"""

import os
import sys

# Add the project root to sys.path to allow imports like 'import_pipeline.summaries'
script_dir = os.path.dirname(__file__)
# Assuming project root is one levels up from this script:
project_root = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.insert(0, project_root)

from shared.lumi_doc import (  # noqa: E402
    Heading,
    LumiAbstract,
    LumiContent,
    LumiDoc,
    LumiSection,
    LumiSpan,
    LumiSummaries,
    TextContent,
)

from import_pipeline.summaries import (  # noqa: E402
    FetchLumiSummariesRequestOptions,
    generate_lumi_summaries,
)


def create_dummy_lumi_doc() -> LumiDoc:
    """
    Creates a dummy LumiDoc with one section, one text content, and three spans (sentences).
    Sentences are designed to be easily parsable and long enough for summarization.
    """
    # Create LumiSpan objects for the main content

    span1 = LumiSpan(
        id="span_id_1",
        text="This is the first sentence of our document, containing important information about cats.",
        inner_tags=[],
    )
    span2 = LumiSpan(
        id="span_id_2",
        text="It's important to know that cats are obligatory carnivores.",
        inner_tags=[],
    )
    span3 = LumiSpan(
        id="span_id_3",
        text="This sentence includes an equation $E=mc^2$ to test math handling.",
        inner_tags=[],
    )
    span4 = LumiSpan(
        id="span_id_4",
        text="Finally, the fourth sentence concludes this initial thought with a summary.",
        inner_tags=[],
    )

    # Create TextContent
    text_content = TextContent(tag_name="p", spans=[span1, span2, span3, span4])

    # Create LumiContent
    lumi_content = LumiContent(id="main_content_id", text_content=text_content)

    # Create Heading
    heading = Heading(heading_level=2, text="Introduction to Dummy Document")

    # Create nested section for testing
    nested_span_id = "nested_span_id"
    nested_span = LumiSpan(
        id=nested_span_id,
        text="This is a sentence within a nested subsection. Need to make it longer so it exceeds the min character length...",
        inner_tags=[],
    )
    nested_text_content = TextContent(tag_name="p", spans=[nested_span])
    nested_lumi_content_id = "nested_content_id"
    nested_lumi_content = LumiContent(
        id=nested_lumi_content_id, text_content=nested_text_content
    )
    nested_heading = Heading(heading_level=3, text="Nested Subsection")
    nested_section_id = "section_id"
    nested_section = LumiSection(
        id=nested_section_id,
        heading=nested_heading,
        contents=[nested_lumi_content],
        sub_sections=[],
    )

    # Create LumiSection
    lumi_section = LumiSection(
        id="main_section_id",
        heading=heading,
        contents=[lumi_content],
        sub_sections=[nested_section],
    )

    # Create LumiAbstract
    abstract_spans = [
        LumiSpan(
            id="abs_span_1_id",
            text="This is the dummy abstract's first sentence.",
            inner_tags=[],
        ),
        LumiSpan(
            id="abs_span_2_id",
            text="This second sentence is the most important one for the abstract excerpt.",
            inner_tags=[],
        ),
    ]
    abstract_content = LumiContent(
        id="abs_content_id",
        text_content=TextContent(tag_name="p", spans=abstract_spans),
    )
    lumi_abstract = LumiAbstract(contents=[abstract_content])

    # Create LumiDoc
    dummy_doc = LumiDoc(
        markdown="",
        sections=[lumi_section],
        concepts=[],
        abstract=lumi_abstract,
    )
    return dummy_doc


def print_lumi_summaries(summaries: LumiSummaries):
    """Prints the components of a LumiSummaries object in a readable format."""
    print("\n--- Lumi Summaries Output ---")

    print("Abstract Excerpt Span ID:", summaries.abstract_excerpt_span_id)

    print("\nSection Summaries:")
    if summaries.section_summaries:
        for s in summaries.section_summaries:
            print(f"  - ID: {s.id}, Summary: {s.summary.text}")
    else:
        print("  No section summaries generated.")

    print("\nContent Summaries:")
    if summaries.content_summaries:
        for c in summaries.content_summaries:
            print(
                f"  - ID: {c.id}, Summary: {c.summary.text}, InnerTags: {c.summary.inner_tags}"
            )
    else:
        print("  No content summaries generated.")

    print("\nSpan Summaries:")
    if summaries.span_summaries:
        for sp in summaries.span_summaries:
            print(
                f"  - ID: {sp.id}, Summary: {sp.summary.text}, InnerTags: {sp.summary.inner_tags}"
            )
    else:
        print("  No span summaries generated.")
    print("-----------------------------\n")


if __name__ == "__main__":
    print("Creating dummy LumiDoc...")
    dummy_doc = create_dummy_lumi_doc()
    print("Dummy LumiDoc created successfully.")

    print("Configuring summarization options...")
    options = FetchLumiSummariesRequestOptions(
        include_section_summaries=True,
        include_content_summaries=True,
        include_span_summaries=True,
        include_abstract_excerpt=True,
    )
    print("Summarization options configured.")

    print("Generating Lumi summaries (this calls the Gemini API)...")
    lumi_summaries_result = generate_lumi_summaries(dummy_doc, options)
    print("Lumi summaries generated.")

    print("Printing generated summaries:")
    print_lumi_summaries(lumi_summaries_result)
