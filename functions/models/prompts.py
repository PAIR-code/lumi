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

import json

from typing import List
from dataclasses import asdict
from shared import import_tags
from shared.lumi_doc import LumiConcept, LumiDoc
from shared import prompt_utils
from shared.types_local_storage import PaperData

# TODO(ellenj): Consider re-adding these prompt lines if needed.
# *   **Noise Removal:** Actively identify and remove page gutter text, running headers/footers, or any other noisy text that is not part of the main content.
# *   **Text Flow & Paragraphs:** Remove hyphens from line-broken hyphenated words to restore original word forms. Important: Make sure to preserve paragraph line breaks from the original paper.
# *   **Links:** Preserve all existing links, especially those pointing to references. Each reference at the end of the document should be formatted on its own line.
# *   **Ordering Preservation:** Make sure the flow of the sections and images follow the flow from the original PDF - if there are columns, the left column should come before the right column.
# *   **Concepts:** Any time a Lumi Concept is mentioned, wrap it like `{import_tags.L_CONCEPT_START_PREFIX}id{import_tags.L_CONCEPT_END}concept text{import_tags.L_CONCEPT_START_PREFIX}id{import_tags.L_CONCEPT_END}`, where N is the id of the concept in the given list of Lumi Concepts. Do NOT mark concepts within headers or references.

# TODO(ellenj): Figure out how to pass this prompt so the brackets are single brackets in both prompts.
SHARED_FORMATTING_INSTRUCTIONS = r"""
*   **Formatting Preservation:** Crucially, preserve all bold and italic formatting from the original PDF.
*   **Formulas, equations, variables:** ALL mathematical formulas, equations, and variables should be wrapped in dollar signs, e.g., `$formula$`. 
        Try to convert latex equations into something supported by KaTeX html rendering. 
        \begin{{equation}} and \end{{equation}} should be replaced with $ and $
        \begin{{align}} and \end{{align}} with equations inside should also instead by wrapped in $ and $
"""

PDF_IMPORT_FORMATTING_INSTRUCTIONS = (
    r"""Within these structural tags (but do NOT add any tags within header text), apply the following detailed markdown formatting rules:"""
    + SHARED_FORMATTING_INSTRUCTIONS
    + rf"""
*   **Headings:** Maintain the hierarchical header structure from the file, using `#` or `##` markdown headers. Do *not* use `*header*` style. Assume most academic papers will start with "Abstract" and "Introduction" as the first major headers (though "Abstract" will be wrapped in its own `{import_tags.L_ABSTRACT_START}` block). Maintain any numbering (e.g., "I. INTRODUCTION", "A. CONTRIBUTIONS").
*   **Images:** Images must have a placeholder formatted as `{import_tags.L_IMG_START_PREFIX}X{import_tags.L_IMG_END}`, where X is the exact image path value cited in the latex file. Ensure image captions are maintained and included as  `{import_tags.L_IMG_CAP_START_PREFIX}X{import_tags.L_IMG_CAP_END}caption text{import_tags.L_IMG_CAP_START_PREFIX}X{import_tags.L_IMG_CAP_END}` directly after the image. Make sure images are wrapped within the special tags such as {import_tags.L_CONTENT_START} and {import_tags.L_CONTENT_END} unless they are after the references section.
*   **Inline references:** Wrap any inline references inside like `{import_tags.L_CITATION_START_PREFIX}X{import_tags.L_CITATION_END}citation text{import_tags.L_CITATION_START_PREFIX}X{import_tags.L_CITATION_END}` with the original PDF paper text within them, where X corresponds with the reference id - X should use the citation id from the latex file.
*   **Tables, Algorithms and ALL other text-based figures and explanatory containers:** Wrap these within {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END} and {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}, and reproduce the table, algorithm, or other text figure in HTML instead of markdown, matching the format as well as possible (Just output html without any html``` decorators). Ensure the captions are maintained and placed within {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END} and {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END}, following the {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}.
*   **Captions: Within the {import_tags.L_IMG_CAP_START_PREFIX}X{import_tags.L_IMG_CAP_END} tags (where X is the image path value), captions must keep the '{{chart type}} N' text as it appears in the paper caption, such as 'Figure N' or 'Table N'.

"""
)

PDF_IMPORT_PROMPT = f"""Use the latex to figure out the formatting for this paper and the pdf bytes to fill in any gaps. I want the paper text extracted in markdown.

Your output must strictly adhere to the following structure using special tags, leveraging your knowledge of the PDF layout for accurate section identification:

1.  **Title and Authors:** Usually the very first text, representing the document's main title and its authors, should be wrapped in `{import_tags.L_TITLE_START}` and `{import_tags.L_TITLE_END}`. Each distinct line or logical group (e.g., title itself, then author list) should receive its own separate pair of these tags.
    *   Example: `{import_tags.L_TITLE_START} # Main Title {import_tags.L_TITLE_END}` followed by `{import_tags.L_AUTHORS_START} Author One, Author Two {import_tags.L_AUTHORS_END}`.
2.  **Abstract:** The entire abstract section, excluding its header, must be wrapped in `{import_tags.L_ABSTRACT_START}` and `{import_tags.L_ABSTRACT_END}`.
3.  **Main Content:** All primary body content, typically starting immediately after the "Abstract" and extending up to (but *not* including) the "References" section, must be wrapped in `{import_tags.L_CONTENT_START}` and `{import_tags.L_CONTENT_END}`.
4.  **References:** The references section should be wrapped in `{import_tags.L_REFERENCES_START}` and `{import_tags.L_REFERENCES_END}`, and should NOT include any references header. Each individual reference should be wrapped in `{import_tags.L_REFERENCE_ITEM_START_PREFIX}X{import_tags.L_REFERENCE_ITEM_END}` and `{import_tags.L_REFERENCE_ITEM_END_GENERIC}`, where X is the citation id from the latex file. It should maintain the original bold / italic formatting as well.
5.  **Text Flow & Paragraphs:** Important: Make sure to preserve paragraph line breaks from the original paper.

Stop generating after {import_tags.L_REFERENCES_END} - references should be the last section.
Do not include anything from the Appendix section.

{PDF_IMPORT_FORMATTING_INSTRUCTIONS}

Make sure that the content is accurate to the pdf bytes and does NOT include any latex syntax outside of the $equations$.
"""

CONCEPT_EXTRACTION_PROMPT = """You are an expert academic assistant tasked with extracting key concepts and terms
    from research paper abstracts. For each concept, provide its name and a brief
    description or relevant detail from the abstract.

    Your output MUST be a JSON object with a single key 'concepts', which contains
    a list of concept objects. Each concept object must have 'name' and 'contents'.
    The 'contents' field should be a list of objects, where each object has a 'label'
    (e.g., "description") and a 'value' (the actual description/detail).

    You should include exactly 1 'content' with the label 'description' for each concept, where the description is
    concise, at most 8-16 words.

    DO NOT include 'id' or 'in_text_citations' in your JSON output; these will be
    handled by the downstream parsing script.

    Example JSON output structure:
    {
      "concepts": [
        {
          "name": "Large Language Models",
          "contents": [
            {
              "label": "description",
              "value": "Advanced AI models capable of understanding and generating human language."
            }
          ]
        },
        {
          "name": "Semantic Search",
          "contents": [
            {
              "label": "description",
              "value": "A search technique that understands the meaning and context of queries."
            }
          ]
        }
      ]
    }
"""

LUMI_ANSWER_PREAMBLE_PROMPT = f"""You are a helpful research assistant. You will be given a list of sentences from a document, and a user request.
Your task is to respond to the user's request both based on general knowledge, and based on the information contained in the provided sentences.


You can cite multiple sentences. Be concise and do not make up information. 

Your response should give an 8-10 word quick response in the beginning in (markdown) bold and in total be at most 1-2 sentences (10-50 words). Put important words in markdown bold etc. to make it easier to parse.

{SHARED_FORMATTING_INSTRUCTIONS}

When you use information from a sentence, you must cite it by adding a reference after the information with {import_tags.S_REF_START_PREFIX}id{import_tags.S_REF_END}N{import_tags.S_REF_END_GENERIC}, where `[id]` is the id of the sentence you are referencing and N is the 1-index of this reference within this answer.
For example, if you use text from a sentence with id 's1' and this is the first reference, the output should look like: {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}.

* References should have commas separating them (if there are multiple in a row) and wrapped in parenthesis so they look like ({import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}, {import_tags.S_REF_START_PREFIX}s2{import_tags.S_REF_END}2{import_tags.S_REF_END_GENERIC}).

"""

_LUMI_ANSWER_BASE_PROMPT = (
    LUMI_ANSWER_PREAMBLE_PROMPT
    + r"""
Here are the sentences from the document:
{spans_string}

{history_string}
"""
)

LUMI_PROMPT_DEFINE = (
    _LUMI_ANSWER_BASE_PROMPT
    + """
The user has highlighted the following text and wants a definition: "{highlight}"

Please provide a concise definition or explanation of the highlighted text.
"""
)

LUMI_PROMPT_ANSWER = (
    _LUMI_ANSWER_BASE_PROMPT
    + """
The user has asked the following question: "{query}"

Please provide a concise answer to the question.
"""
)

LUMI_PROMPT_ANSWER_WITH_CONTEXT = (
    _LUMI_ANSWER_BASE_PROMPT
    + """
The user has highlighted the following text: "{highlight}"
And has asked the following question: "{query}"

Please provide a concise answer to the question, using the highlighted text as context.
"""
)

PERSONAL_SUMMARY_PROMPT = f"""You are a helpful research assistant. You will be given the full text of a research paper and a list of other papers the user has read (which might be blank).
Your task is to provide a personalized summary of the current paper for the user.

The summary should have two parts:
1. A brief, 8-16 word explanation of the current paper's content.
2. A short explanation (8-30 words) that contextualizes the current paper with the user's reading history. If there are relevant connections, point them out. If not, you can state that. If the reading history is empty, omit this section.
3. A list of 1-3 key points from the current paper that the user might find interesting (summarized in 5-10 words each). For each point, provide the `span_id` using the citation pattern below (text in the citation should be brief, just 1-2 words).

Your response should be formatted as a blocks of text. Use markdown for formatting (bold, italics, bullets).

When you use information from a sentence, you must cite it by adding a reference after the information with {import_tags.S_REF_START_PREFIX}id{import_tags.S_REF_END}N{import_tags.S_REF_END_GENERIC}, where `[id]` is the id of the sentence you are referencing and N is the 1-index of this reference within this answer.
For example, if you use text from a sentence with id 's1' and this is the first reference, the output should look like: {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}.

* References should have commas separating them (if there are multiple in a row) and wrapped in parenthesis so they look like ({import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}, {import_tags.S_REF_START_PREFIX}s2{import_tags.S_REF_END}2{import_tags.S_REF_END_GENERIC}).


Here is the current paper:
{{current_paper_text}}

Here is the user's reading history:
{{past_papers_text}}
"""


def make_import_pdf_prompt(concepts: List[LumiConcept]):
    stringified_concepts = "\n".join(
        [json.dumps(asdict(concept)) for concept in concepts]
    )
    return f"{PDF_IMPORT_PROMPT}"


def make_concept_extraction_prompt(abstract: str):
    return f"{CONCEPT_EXTRACTION_PROMPT}\n\nHere is the abstract: {abstract}"


def make_personal_summary_prompt(doc: LumiDoc, past_papers: List[PaperData]):
    all_spans = prompt_utils.get_all_spans_from_doc(doc)
    formatted_spans = prompt_utils.get_formatted_spans_list(all_spans)
    spans_string = "\n".join(formatted_spans)

    past_papers_text = []
    for paper in past_papers:
        past_papers_text.append(f"- {paper.metadata.title}: {paper.metadata.summary}")

    return PERSONAL_SUMMARY_PROMPT.format(
        current_paper_text=spans_string, past_papers_text="\n".join(past_papers_text)
    )
