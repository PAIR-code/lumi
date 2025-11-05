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
import base64
import json
from litellm import completion
from models import api_config
from models import prompts
from shared.lumi_doc import LumiConcept
from shared.import_tags import L_REFERENCES_START, L_REFERENCES_END
from typing import List, Type, TypeVar
from firebase_functions import logger

API_KEY_LOGGING_MESSAGE = "Ran with user-specified API key"
QUERY_RESPONSE_MAX_OUTPUT_TOKENS = 4000
DEFAULT_MODEL = "gpt-4.1-2025-04-14"

T = TypeVar("T")


class GeminiInvalidResponseException(Exception):
    pass


def call_predict(
    query="The opposite of happy is",
    model=DEFAULT_MODEL,
    api_key: str | None = None,
) -> str:
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": query}],
            api_key=api_key,
            temperature=0,
            max_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS,
            num_retries=3,
        )
        text = response.choices[0].message.content
        if not text:
            raise GeminiInvalidResponseException()
        return text
    except Exception as e:
        logger.error(f"LiteLLM API error: {e}")
        raise GeminiInvalidResponseException() from e


def call_predict_with_image(
    prompt: str,
    image_bytes: bytes,
    model=DEFAULT_MODEL,
    api_key: str | None = None,
) -> str:
    """Calls GPT-4.1 with a prompt and an image."""
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    truncated_query = (prompt[:200] + "...") if len(prompt) > 200 else prompt
    print(
        f"  > Calling GPT-4.1 with image, prompt: '{truncated_query}' \nimage: {image_bytes[:50]}"
    )

    try:
        response = completion(
            model=model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_base64}"}
                    }
                ]
            }],
            api_key=api_key,
            temperature=0,
            max_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS,
            num_retries=3,
        )
        text = response.choices[0].message.content
        if not text:
            raise GeminiInvalidResponseException()
        return text
    except Exception as e:
        logger.error(f"LiteLLM vision API error: {e}")
        raise GeminiInvalidResponseException() from e


def call_predict_with_schema(
    query: str,
    response_schema: Type[T],
    model=DEFAULT_MODEL,
    api_key: str | None = None,
) -> T | List[T] | None:
    """Calls GPT-4.1 with a response schema for structured output."""
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    # Determine if response_schema is a list type
    is_list = False
    inner_type = response_schema
    if hasattr(response_schema, '__origin__') and response_schema.__origin__ is list:
        is_list = True
        inner_type = response_schema.__args__[0]
        schema = {
            "type": "array",
            "items": inner_type.model_json_schema()
        }
    else:
        schema = response_schema.model_json_schema()

    start_time = time.time()
    truncated_query = (query[:200] + "...") if len(query) > 200 else query
    print(f"  > Calling GPT-4.1 with schema, prompt: '{truncated_query}'")

    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": query}],
            api_key=api_key,
            response_format={
                "type": "json_object",
                "response_schema": schema,
            },
            temperature=0,
            num_retries=3,
        )

        print(f"  > GPT-4.1 with schema call took: {time.time() - start_time:.2f}s")

        json_text = response.choices[0].message.content
        if not json_text:
            raise GeminiInvalidResponseException()

        # Parse JSON and convert to Pydantic objects
        parsed_data = json.loads(json_text)

        if is_list:
            return [inner_type(**item) for item in parsed_data]
        else:
            return response_schema(**parsed_data)

    except Exception as e:
        print(f"An error occurred during predict with schema API call: {e}")
        return None


def format_pdf_with_latex(
    pdf_data: bytes,
    latex_string: str,
    concepts: List[LumiConcept],
    model=DEFAULT_MODEL,
) -> str:
    """
    Calls GPT-4.1 to format the pdf, using the latex source as additional context.

    Note: GPT-4.1 does not support thinking_config like Gemini 2.5 Pro, but has
    strong built-in reasoning capabilities for document processing.

    Args:
        pdf_data (bytes): The raw bytes from the paper pdf document.
        latex_string (str): The combined LaTeX source as a string.
        concepts (List[LumiConcept]): A list of concepts to identify.
        model (str): The model to call with.

    Returns:
        str: The formatted pdf markdown.
    """
    start_time = time.time()
    prompt = prompts.make_import_pdf_prompt(concepts)
    truncated_prompt = (prompt[:200] + "...") if len(prompt) > 200 else prompt
    print(f"  > Calling GPT-4.1 to format PDF, prompt: '{truncated_prompt}'")

    pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')

    # Build content array: PDF first, then optional LaTeX, then prompt
    content = [
        {
            "type": "document_url",
            "document_url": {"url": f"data:application/pdf;base64,{pdf_base64}"}
        }
    ]

    if latex_string:
        content.append({"type": "text", "text": f"LaTeX Source:\n{latex_string}"})

    content.append({"type": "text", "text": prompt})

    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": content}],
            api_key=api_config.DEFAULT_API_KEY,
            temperature=0,
            stop=[L_REFERENCES_END],
            num_retries=3,
        )

        print(f"  > GPT-4.1 format PDF call took: {time.time() - start_time:.2f}s")

        response_text = response.choices[0].message.content
        if not response_text:
            raise GeminiInvalidResponseException()

        # Post-processing for reference section
        if L_REFERENCES_START in response_text and L_REFERENCES_END not in response_text:
            response_text += L_REFERENCES_END

        return response_text

    except Exception as e:
        logger.error(f"LiteLLM PDF processing error: {e}")
        raise GeminiInvalidResponseException() from e
