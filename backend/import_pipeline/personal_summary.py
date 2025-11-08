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
import time

from llm_models import llm, prompts
from shared.api import LumiAnswer, LumiAnswerRequest
from shared.constants import PERSONAL_SUMMARY_QUERY_NAME
from shared.lumi_doc import LumiContent, LumiDoc, LumiSpan, TextContent
from shared.types_local_storage import PaperData
from shared.utils import get_unique_id

from import_pipeline import convert_html_to_lumi, markdown_utils


def get_personal_summary(
    doc: LumiDoc, past_papers: list[PaperData], api_key: str | None
) -> LumiAnswer:
    """
    Generates a personalized summary for a document.

    Args:
        doc (LumiDoc): The document to summarize.
        past_papers (List[PaperData]): A list of past papers for context.

    Returns:
        LumiAnswer: The generated personalized summary, packaged as a LumiAnswer.
    """
    prompt = prompts.make_personal_summary_prompt(doc, past_papers)
    markdown_response = llm.call_predict(prompt)
    html_response = markdown_utils.markdown_to_html(markdown_response)

    # Parse the markdown response to create LumiContent objects.
    response_sections = convert_html_to_lumi.convert_to_lumi_sections(
        html_response, placeholder_map={}, strip_double_brackets=True
    )

    response_content: list[LumiContent] = []
    for section in response_sections:
        response_content.extend(section.contents)

    # If parsing fails or returns no content, create a single raw span as a fallback.
    if not response_content:
        fallback_span = LumiSpan(
            id=get_unique_id(), text=markdown_response, inner_tags=[]
        )
        fallback_text_content = TextContent(tag_name="p", spans=[fallback_span])
        fallback_content = LumiContent(
            id=get_unique_id(), text_content=fallback_text_content
        )
        response_content = [fallback_content]

    request = LumiAnswerRequest(query=PERSONAL_SUMMARY_QUERY_NAME)

    return LumiAnswer(
        id=get_unique_id(),
        request=request,
        response_content=response_content,
        timestamp=int(time.time()),
    )
