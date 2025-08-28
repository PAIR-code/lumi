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
from google import genai
from google.genai import types
from models import api_config
from models import prompts
from shared.lumi_doc import LumiConcept
from shared.import_tags import L_REFERENCES_START, L_REFERENCES_END
from typing import List, Type, TypeVar
from firebase_functions import logger
from firebase_functions import logger

API_KEY_LOGGING_MESSAGE = "Ran with user-specified API key"
QUERY_RESPONSE_MAX_OUTPUT_TOKENS = 2000

T = TypeVar("T")


class GeminiInvalidResponseException(Exception):
    pass


def call_predict(
    query="The opposite of happy is",
    model="gemini-2.5-flash",
    api_key: str | None = None,
) -> str:
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=model,
        contents=query,
        config=types.GenerateContentConfig(
            temperature=0, max_output_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS
        ),
    )
    if not response.text:
        raise GeminiInvalidResponseException()
    return response.text


def call_predict_with_image(
    prompt: str,
    image_bytes: bytes,
    model="gemini-2.5-flash",
    api_key: str | None = None,
) -> str:
    """Calls Gemini with a prompt and an image."""
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    client = genai.Client(api_key=api_key)

    truncated_query = (prompt[:200] + "...") if len(prompt) > 200 else prompt
    print(
        f"  > Calling Gemini with image, prompt: '{truncated_query}' \nimage: {image_bytes[:50]}"
    )
    response = client.models.generate_content(
        model=model,
        contents=[
            prompt,
            # When imported, paper images are all saved in PNG format.
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
        ],
        config=types.GenerateContentConfig(
            temperature=0, max_output_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS
        ),
    )
    if not response.text:
        raise GeminiInvalidResponseException()
    return response.text


def call_predict_with_schema(
    query: str,
    response_schema: Type[T],
    model="gemini-2.5-flash",
    api_key: str | None = None,
) -> T | List[T] | None:
    """Calls Gemini with a response schema for structured output."""
    if not api_key:
        api_key = api_config.DEFAULT_API_KEY
    else:
        logger.info(API_KEY_LOGGING_MESSAGE)

    client = genai.Client(api_key=api_key)
    start_time = time.time()
    truncated_query = (query[:200] + "...") if len(query) > 200 else query
    print(f"  > Calling Gemini with schema, prompt: '{truncated_query}'")
    try:
        response = client.models.generate_content(
            model=model,
            contents=query,
            config={
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": 0,
            },
        )
        print(f"  > Gemini with schema call took: {time.time() - start_time:.2f}s")
        if not response.parsed:
            raise GeminiInvalidResponseException()
        return response.parsed
    except Exception as e:
        print(f"An error occurred during predict with schema API call: {e}")
        return None


def format_pdf_with_latex(
    pdf_data: bytes,
    latex_string: str,
    concepts: List[LumiConcept],
    model="gemini-2.5-pro",
) -> str:
    """
    Calls Gemini to format the pdf, using the latex source as additional context.

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
    print(f"  > Calling Gemini to format PDF, prompt: '{truncated_prompt}'")

    contents = [
        types.Part.from_bytes(
            data=pdf_data,
            mime_type="application/pdf",
        ),
        prompt,
    ]

    if latex_string:
        contents.insert(1, latex_string)

    client = genai.Client(api_key=api_config.DEFAULT_API_KEY)

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=5000),
            temperature=0,
            stopSequences=[L_REFERENCES_END],
        ),
    )

    print(f"  > Gemini format PDF call took: {time.time() - start_time:.2f}s")

    response_text = response.text
    if not response_text:
        raise GeminiInvalidResponseException()

    if L_REFERENCES_START in response_text and L_REFERENCES_END not in response_text:
        response_text += L_REFERENCES_END
    return response_text
