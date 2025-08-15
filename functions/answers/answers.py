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
"""Generates answers to user queries based on document context."""

import time
from typing import List

from shared.lumi_doc import LumiDoc, LumiSpan, LumiContent, TextContent
from shared import prompt_utils
from shared.api import LumiAnswer, LumiAnswerRequest
from models import gemini
from models import prompts
from import_pipeline import convert_html_to_lumi, markdown_utils, image_utils
from shared.utils import get_unique_id


def generate_lumi_answer(
    doc: LumiDoc,
    request: LumiAnswerRequest,
) -> LumiAnswer:
    """
    Generates a LumiAnswer by calling the Gemini API.

    This function selects the appropriate prompt based on the user's request
    (query, highlight, or both), calls the Gemini model to get a markdown
    response with inline citations, and then formats it into a LumiAnswer object.
    """
    query = request.query
    highlight = request.highlight
    image_info = request.image

    all_spans = prompt_utils.get_all_spans_from_doc(doc)
    formatted_spans = prompt_utils.get_formatted_spans_list(all_spans)
    spans_string = "\n".join(formatted_spans)

    if image_info:
        caption = image_info.caption or ""
        if query:
            prompt = prompts.LUMI_PROMPT_ANSWER_IMAGE.format(
                spans_string=spans_string,
                query=query,
                caption=caption,
            )
        else:
            prompt = prompts.LUMI_PROMPT_DEFINE_IMAGE.format(
                spans_string=spans_string,
                caption=caption,
            )
    else:
        if query and highlight:
            prompt = prompts.LUMI_PROMPT_ANSWER_WITH_CONTEXT.format(
                spans_string=spans_string,
                highlight=highlight,
                query=query,
            )
        elif query:
            prompt = prompts.LUMI_PROMPT_ANSWER.format(
                spans_string=spans_string,
                query=query,
            )
        elif highlight:
            prompt = prompts.LUMI_PROMPT_DEFINE.format(
                spans_string=spans_string,
                highlight=highlight,
            )
        else:
            # Should not happen with proper request validation
            raise ValueError("Request must include at least a query or a highlight.")

    if image_info:
        image_bytes = image_utils.download_image_from_gcs(image_info.image_storage_path)
        markdown_response = gemini.call_predict_with_image(
            prompt=prompt, image_bytes=image_bytes
        )
    else:
        markdown_response = gemini.call_predict(prompt)

    html_response = markdown_utils.markdown_to_html(markdown_response)

    # Parse the markdown response to create LumiContent objects.
    response_sections = convert_html_to_lumi.convert_to_lumi_sections(
        html_response, placeholder_map={}
    )

    response_content: List[LumiContent] = []
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

    return LumiAnswer(
        id=get_unique_id(),
        request=request,
        response_content=response_content,
        # TODO(ellenj): Unify on timestamps with the front-end.
        timestamp=int(time.time()),
    )


def remove_p_tags(html_string: str):
    html_string = html_string.strip()
    if html_string.startswith("<p>"):
        html_string = html_string[3:]
    if html_string.endswith("</p>"):
        html_string = html_string[:-4]
    return html_string
