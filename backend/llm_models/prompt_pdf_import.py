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
*   **Quotation marks:** `` and '' are used for quotation marks in latex and should be translated into " and "
*   **Formulas, equations, variables:** ALL mathematical formulas, equations, and variables should be wrapped in single or double dollar signs, e.g., `$formula$` or `$$long equation$$`, following the dollar signs used in the original latex.
        Try to convert latex equations into something supported by KaTeX html rendering.
        \begin{{equation}} and \end{{equation}} should be replaced with $$ and $$
        \begin{{align}} and \end{{align}} with equations inside should also instead by wrapped in $$ and $$
        True dollar signs should be represented with \$ just as in latex.
*   **Headings:** Maintain the hierarchical header structure from the file, using `#` or `##` markdown headers. Do *not* use `*header*` style. Assume most academic papers will start with "Abstract" and "Introduction" as the first major headers (though "Abstract" will be wrapped in its own `{import_tags.L_ABSTRACT_START}` block). Maintain any numbering (e.g., "I. INTRODUCTION", "A. CONTRIBUTIONS").
*   **Figures with Subfigures:** For figures that contain subfigures (like in the LaTeX `figure*` environment with `\begin{{subfigure\}}` contained within `\begin{{figure\}}`), use the following structure:
    *   Wrap the entire figure block with `{import_tags.L_FIG_START_PREFIX}FIG_ID{import_tags.L_FIG_END}` and `{import_tags.L_FIG_START_PREFIX}FIG_ID{import_tags.L_FIG_END}`. `FIG_ID` should be a unique identifier for the figure, like the one from `\label{{fig:interf_NVIDIA}}`.
    *   Inside this block, each subfigure's image should be tagged using the standard image tag: `{import_tags.L_IMG_START_PREFIX}path{import_tags.L_IMG_END}`.
    *   Each subfigure's caption (if it has one) should follow its image tag, using the standard image caption tag: `{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}caption text{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}`.
    *   The main caption for the entire figure should be placed after the figure block, using `{import_tags.L_FIG_CAP_START_PREFIX}FIG_ID{import_tags.L_FIG_CAP_END}main caption text{import_tags.L_FIG_CAP_START_PREFIX}FIG_ID{import_tags.L_FIG_CAP_END}`.
*   **Images (standalone):** For standalone images (not in a subfigure group), use the standard image tag: `{import_tags.L_IMG_START_PREFIX}path{import_tags.L_IMG_END}`, where path is the exact image path value cited in the latex file (Usually found in \includegraphics{{path}} - typically following the format 'directory/image_name.ext'). Ensure image captions are maintained and included as `{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}caption text{import_tags.L_IMG_CAP_START_PREFIX}path{import_tags.L_IMG_CAP_END}` directly after the image.
*   **Inline references:** Wrap any inline references inside like `{import_tags.L_CITATION_START_PREFIX}X{import_tags.L_CITATION_END}`, where X corresponds with the reference id - X should use the citation id from the latex file often within `\cite{{id}}`.
*   **Footnotes:** For LaTeX footnotes (`\footnote{{...}}`, `\footnotemark`, `\footnotetext{{...}}`), use the following tagging scheme:
    *   Generate a unique, sequential ID for each footnote (e.g., 1, 2, 3).
    *   At the point of the footnote reference in the main text, insert a marker tag: `{import_tags.L_FOOTNOTE_MARKER_PREFIX}ID{import_tags.L_FOOTNOTE_MARKER_END}`.
    *   The content of the footnote should be placed in a dedicated footnotes section at the end of the document.
    *   The content for each footnote should be wrapped in content tags: `{import_tags.L_FOOTNOTE_CONTENT_START_PREFIX}ID{import_tags.L_FOOTNOTE_CONTENT_END_PREFIX}{import_tags.L_FOOTNOTE_CONTENT_END}the footnote text{import_tags.L_FOOTNOTE_CONTENT_END_PREFIX}ID{import_tags.L_FOOTNOTE_CONTENT_END}`.
*   **Tables, Algorithms and ALL other text-based figures and explanatory containers:** Wrap these within {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END} and {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}, and reproduce the table, algorithm, or other text figure in HTML instead of markdown, matching the format as well as possible (Just output html without any html``` decorators). Variables can be placed within $variable$. Ensure the captions are maintained and placed within {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END} and {import_tags.L_HTML_CAP_START_PREFIX}N{import_tags.L_HTML_CAP_END}, following the {import_tags.L_HTML_START_PREFIX}N{import_tags.L_HTML_END}.
*   **Captions: Within the {import_tags.L_IMG_CAP_START_PREFIX}X{import_tags.L_IMG_CAP_END} tags (where X is the image path value), captions must keep the '{{chart type}} N' text as it appears in the paper caption, such as 'Figure N' or 'Table N'.

"""

PDF_IMPORT_PROMPT = f"""Use the latex to figure out the formatting for this paper and the pdf bytes to fill in any gaps. I want the paper text extracted in markdown.

Your output must strictly adhere to the following structure using special tags, leveraging your knowledge of the PDF layout for accurate section identification:

1.  **Title and Authors:** Usually the very first text, representing the document's main title and its authors, should be wrapped in `{import_tags.L_TITLE_START}` and `{import_tags.L_TITLE_END}`. Each distinct line or logical group (e.g., title itself, then author list) should receive its own separate pair of these tags.
    *   Example: `{import_tags.L_TITLE_START} # Main Title {import_tags.L_TITLE_END}` followed by `{import_tags.L_AUTHORS_START} Author One, Author Two {import_tags.L_AUTHORS_END}`.
2.  **Abstract:** The entire abstract section, excluding its header, must be wrapped in `{import_tags.L_ABSTRACT_START}` and `{import_tags.L_ABSTRACT_END}`.
3.  **Main Content:** All primary body content, typically starting immediately after the "Abstract" and extending up to (but *not* including) the "References" section, must be wrapped in `{import_tags.L_CONTENT_START}` and `{import_tags.L_CONTENT_END}`.
4.  **Footnotes:** After main content and before the references, include a footnotes section wrapped in `{import_tags.L_FOOTNOTES_START}` and `{import_tags.L_FOOTNOTES_END}`. This section will contain the content of all footnotes from the document.
5.  **References:** The references section should be wrapped in `{import_tags.L_REFERENCES_START}` and `{import_tags.L_REFERENCES_END}`, and should NOT include any references header. Each individual reference should be wrapped in `{import_tags.L_REFERENCE_ITEM_START_PREFIX}X{import_tags.L_REFERENCE_ITEM_END}` and `{import_tags.L_REFERENCE_ITEM_END_GENERIC}`, where X is the citation id from the latex file. It should maintain the original bold / italic formatting as well.
6.  **Text Flow & Paragraphs:** Important: Make sure to preserve paragraph line breaks from the original paper.

Stop generating after {import_tags.L_REFERENCES_END} - footnotes should be the last section.
Do not include anything from the Appendix section.

{PDF_IMPORT_FORMATTING_INSTRUCTIONS}

Make sure that the content is accurate to the pdf bytes and does NOT include any latex syntax outside of the $equations$.

Your output should look something like:

[[l-tit]]Paper Title[[l-tit]]
[[l-aut]]Authors[[l-aut]]

[[l-abs]]...abstract content...[[l-abs]]

[[l-con]]

# Heading (likely Introduction)

[[l-fig-start-FIG1]]
    [[l-image_imgs/sub_1.png]]
    [[l-image_cap_imgs/sub_1.png]]Fig. 1a: Subfigure one caption.[[l-image_cap_imgs/sub_1.png]]
    [[l-image_imgs/sub_2.png]]
    [[l-image_cap_imgs/sub_2.png]]Fig. 1b: Subfigure two caption.[[l-image_cap_imgs/sub_2.png]]
[[l-fig-end-FIG1]]
[[l-fig-cap-FIG1]]Fig. 1: Main figure caption.[[l-fig-cap-FIG1]]


Optional content

## Subheading 1

This is a sentence with a citation [[l-cit-citation1]] and a footnote[[l-foot-1]].

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


[[l-footnotes-start]]
[[l-footnote-start-1]]This is the first footnote's text.[[l-footnote-end-1]]
[[l-footnotes-end]]

[[l-refs-start]]
[[l-ref-citation1]][1] authors, "Title" in conference, year...[[l-ref]]
[[l-refs-end]]
"""


def make_import_pdf_prompt(concepts: list[LumiConcept]):
    return f"{PDF_IMPORT_PROMPT}"
