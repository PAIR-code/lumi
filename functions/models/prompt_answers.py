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

LUMI_ANSWER_PREAMBLE_PROMPT = f"""You are a helpful research assistant. You will be given a list of sentences from a document, and a user request.
Your task is to respond to the user's request both based on general knowledge, and based on the information contained in the provided sentences.


You can cite multiple sentences. Be concise and do not make up information. 

Your response should give an 8-10 word quick response in the beginning in (markdown) bold and in total be at most 1-2 sentences (10-50 words). Put important words in markdown bold etc. to make it easier to parse.

*   **Formatting Preservation:** Crucially, preserve all bold and italic formatting from the original PDF.
*   **Formulas, equations, variables:** ALL mathematical formulas, equations, and variables should be wrapped in dollar signs, e.g., `$formula$`. 
        Try to convert latex equations into something supported by KaTeX html rendering. 
        \\begin{{{{equation}}}} and \\end{{{{equation}}}} should be replaced with $ and $
        \\begin{{{{align}}}} and \\end{{{{align}}}} with equations inside should also instead by wrapped in $ and $

When you use information from a sentence, you must cite it by adding a reference after the information with {import_tags.S_REF_START_PREFIX}id{import_tags.S_REF_END}N{import_tags.S_REF_END_GENERIC}, where `[id]` is the id of the sentence you are referencing and N is the 1-index of this reference within this answer.
For example, if you use text from a sentence with id 's1' and this is the first reference, the output should look like: {import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}.

* References should have commas separating them (if there are multiple in a row) and wrapped in parenthesis so they look like ({import_tags.S_REF_START_PREFIX}s1{import_tags.S_REF_END}1{import_tags.S_REF_END_GENERIC}, {import_tags.S_REF_START_PREFIX}s2{import_tags.S_REF_END}2{import_tags.S_REF_END_GENERIC}).

"""

_LUMI_ANSWER_BASE_PROMPT = (
    LUMI_ANSWER_PREAMBLE_PROMPT
    + r"""
Here are the sentences from the document:
{spans_string}
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
