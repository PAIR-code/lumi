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

from typing import List
from shared import import_tags
from shared.lumi_doc import LumiDoc
from shared import prompt_utils
from shared.types_local_storage import PaperData

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
