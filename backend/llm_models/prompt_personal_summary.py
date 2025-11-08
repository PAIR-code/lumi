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


from shared import import_tags, prompt_utils
from shared.lumi_doc import LumiDoc
from shared.types_local_storage import PaperData

PERSONAL_SUMMARY_PROMPT = f"""You are a helpful research assistant. You will be given the full text of a research paper and a list of other papers the user has read (which might be blank).
Your task is to provide a personalized summary of the current paper for the user.


You can cite multiple sentences. Be concise and do not make up information.

The summary should have three parts, with at most 3 bullets following this format:
[start format]
**A brief, intuitive 8-10 word explanation of the current paper's content in bold.**

A short sentence (8-15 words) that contextualizes the current paper with the user's reading history. If there are relevant connections, point them out. If not, omit this section.
*  **bold topic name:** short key point in 5-8 words followed by citation
*  **bold topic name:** short key point in 5-8 words followed by citation
[end format]

*   **Formatting:** Use bold and italics to make this more parseable.
*   **Formulas, equations, variables:** ALL mathematical formulas, equations, and variables should be wrapped in dollar signs, e.g., `$formula$`.
        Try to convert latex equations into something supported by KaTeX html rendering.
        \\begin{{{{equation}}}} and \\end{{{{equation}}}} should be replaced with $ and $
        \\begin{{{{align}}}} and \\end{{{{align}}}} with equations inside should also instead by wrapped in $ and $
        True dollar signs should be represented with \\$ just as in latex.

When you use information from a sentence, you must cite it by adding a reference after the information with {import_tags.S_REF_START_PREFIX}id{import_tags.S_REF_END}, , where `id` is the id of the sentence you are referencing and N is the 1-index of this reference within this answer.
For example, if you use text from a sentence with id 's1', the output should look like: some text {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}.

* If there are multiple in a row, just show them one after another: {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END} {import_tags.S_REF_START_PREFIX}s2{import_tags.S_REF_END}


Here is the user's reading history:
{{past_papers_text}}

Here are the sentences from the document:
{{current_paper_text}}
"""


def make_personal_summary_prompt(doc: LumiDoc, past_papers: list[PaperData]):
    all_spans = prompt_utils.get_all_spans_from_doc(doc)
    formatted_spans = prompt_utils.get_formatted_spans_list(all_spans)
    spans_string = "\n".join(formatted_spans)

    past_papers_text = []
    for paper in past_papers:
        past_papers_text.append(f"- {paper.metadata.title}: {paper.metadata.summary}")

    return PERSONAL_SUMMARY_PROMPT.format(
        current_paper_text=spans_string, past_papers_text="\n".join(past_papers_text)
    )
