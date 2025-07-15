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
from shared.lumi_doc import LumiConcept

# TODO(ellenj): Consider re-adding these prompt lines if needed.
# *   **Noise Removal:** Actively identify and remove page gutter text, running headers/footers, or any other noisy text that is not part of the main content.
# *   **Text Flow & Paragraphs:** Remove hyphens from line-broken hyphenated words to restore original word forms. Important: Make sure to preserve paragraph line breaks from the original paper.
# *   **Links:** Preserve all existing links, especially those pointing to references. Each reference at the end of the document should be formatted on its own line.
# *   **Ordering Preservation:** Make sure the flow of the sections and images follow the flow from the original PDF - if there are columns, the left column should come before the right column.
# *   **Concepts:** Any time a Lumi Concept is mentioned, wrap it like `{import_tags.L_CONCEPT_START_PREFIX}id{import_tags.L_CONCEPT_END}concept text{import_tags.L_CONCEPT_START_PREFIX}id{import_tags.L_CONCEPT_END}`, where N is the id of the concept in the given list of Lumi Concepts. Do NOT mark concepts within headers or references.

PDF_IMPORT_FORMATTING_INSTRUCTIONS = rf"""Within these structural tags (but do NOT add any tags within header text), apply the following detailed markdown formatting rules:
*   **Formatting Preservation:** Crucially, preserve all bold and italic formatting from the original PDF.
*   **Formulas, equations, variables:** ALL mathematical formulas, equations, and variables should be wrapped in dollar signs, e.g., `$formula$`. 
        Try to convert latex equations into something supported by KaTeX html rendering. 
        \begin{{equation}} and \end{{equation}} should be replaced with $ and $
        \begin{{align}} and \end{{align}} with equations inside should also instead by wrapped in $ and $

*   **Headings:** Maintain the hierarchical header structure from the file, using `#` or `##` markdown headers. Do *not* use `*header*` style. Assume most academic papers will start with "Abstract" and "Introduction" as the first major headers (though "Abstract" will be wrapped in its own `{import_tags.L_ABSTRACT_START}` block). Maintain any numbering (e.g., "I. INTRODUCTION", "A. CONTRIBUTIONS").
*   **Images:** Images must have a placeholder formatted as `{import_tags.L_IMG_START_PREFIX}path{import_tags.L_IMG_END}`, where path is the exact image path value cited in the latex file (Usually found in \includegraphics{{path}} - typically following the format 'directory/image_name.ext'). Ensure image captions are maintained and included as  `{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}caption text{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}` directly after the image. Make sure images are wrapped within the special tags such as {import_tags.L_CONTENT_START} and {import_tags.L_CONTENT_END} unless they are after the references section.
*   **Inline references:** Wrap any inline references inside like `{import_tags.L_CITATION_START_PREFIX}X{import_tags.L_CITATION_END}citation text{import_tags.L_CITATION_START_PREFIX}X{import_tags.L_CITATION_END}` with the original PDF paper text within them, where X corresponds with the reference id - X should use the citation id from the latex file.
*   **Tables, Algorithms and ALL other text-based figures and explanatory containers:** Wrap these within {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END} and {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}, and reproduce the table, algorithm, or other text figure in HTML instead of markdown, matching the format as well as possible (Just output html without any html``` decorators). Ensure the captions are maintained and placed within {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END} and {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END}, following the {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}.
*   **Captions: Within the {import_tags.L_IMG_CAP_START_PREFIX}X{import_tags.L_IMG_CAP_END} tags (where X is the image path value), captions must keep the '{{chart type}} N' text as it appears in the paper caption, such as 'Figure N' or 'Table N'.

"""

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

Your output should look something like: 

[[l-tit]]Paper Title[[l-tit]]
[[l-aut]]Authors[[l-aut]]

[[l-abs]]...abstract content...[[l-abs]]

[[l-con]]

[[l-image_imgs/image_1.png]]
[[l-image_cap_imgs/image_1.png]]Fig. 1: Figure one caption.[[l-image_cap_imgs/image_1.png]]

# Heading (likely Introduction)

Optional content

## Subheading 1

This is a sentence with a citation [[l-cit-citation1]][index][[l-cit-citation1]].

1) Some bullets
2) Bullet number 2

...some more content

## Subheading 2
[[l-image_imgs/image_2.png]]
[[l-image_cap_imgs/image_2.png]]Fig. 2: Figure two caption.[[l-image_cap_imgs/image_2.png]]

Some more content...

[[l-html_table1]]<table>...</table>[[l-html_table1]]
[[l-html_cap_table1]]Table 1: Table one caption.[[l-html_cap_table1]]


[[l-con]]

[[l-refs-start]]
[[l-ref-citation1]][1] authors, "Title" in conference, year...[[l-ref]]
[[l-refs-end]]
"""


def make_import_pdf_prompt(concepts: List[LumiConcept]):
    stringified_concepts = "\n".join(
        [json.dumps(asdict(concept)) for concept in concepts]
    )
    return f"{PDF_IMPORT_PROMPT}"
