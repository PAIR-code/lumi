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

import base64
import json
import logging
import time
from typing import TypeVar, cast, get_args, get_origin

from litellm import completion
from pydantic import BaseModel, create_model
from shared.import_tags import L_REFERENCES_END, L_REFERENCES_START
from shared.lumi_doc import LumiConcept

from llm_models import prompts

logger = logging.getLogger(__name__)

API_KEY_LOGGING_MESSAGE = "Ran with user-specified API key"
QUERY_RESPONSE_MAX_OUTPUT_TOKENS = 4000
DEFAULT_MODEL = "gpt-4.1-2025-04-14"

T = TypeVar("T")


class LLMInvalidResponseException(Exception):
    """Exception raised when LLM returns an invalid or empty response.

    This is a generic exception for all LLM providers (OpenAI, Gemini, etc.),
    not specific to Gemini despite the previous naming.
    """

    pass


def _ensure_strict_schema(schema: dict) -> dict:
    """
    Recursively adds 'additionalProperties': false to all objects in a JSON schema.
    This is required for OpenAI's strict mode structured outputs.
    """
    if isinstance(schema, dict):
        # Add additionalProperties to objects
        if schema.get("type") == "object":
            schema["additionalProperties"] = False

        # Recurse into nested schemas
        for key, value in schema.items():
            if isinstance(value, dict):
                schema[key] = _ensure_strict_schema(value)
            elif isinstance(value, list):
                schema[key] = [
                    _ensure_strict_schema(item) if isinstance(item, dict) else item
                    for item in value
                ]

    return schema


def call_predict(
    query="The opposite of happy is",
    model=DEFAULT_MODEL,
) -> str:
    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": query}],
            temperature=0,
            max_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS,
            num_retries=3,
        )
        text = response.choices[0].message.content
        if not text:
            raise LLMInvalidResponseException()
        return cast(str, text)
    except Exception as e:
        logger.error(f"LiteLLM API error: {e}")
        raise LLMInvalidResponseException() from e


def call_predict_with_image(
    prompt: str,
    image_bytes: bytes,
    model=DEFAULT_MODEL,
) -> str:
    """Calls GPT-4.1 with a prompt and an image."""
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    truncated_query = (prompt[:200] + "...") if len(prompt) > 200 else prompt
    image_preview = image_bytes[:50] if len(image_bytes) > 50 else image_bytes
    print(
        f"  > Calling GPT-4.1 with image, prompt: '{truncated_query}' \nimage: {image_preview!r}"
    )

    try:
        response = completion(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
            temperature=0,
            max_tokens=QUERY_RESPONSE_MAX_OUTPUT_TOKENS,
            num_retries=3,
        )
        text = response.choices[0].message.content
        if not text:
            raise LLMInvalidResponseException()
        return cast(str, text)
    except Exception as e:
        logger.error(f"LiteLLM vision API error: {e}")
        raise LLMInvalidResponseException() from e


def call_predict_with_schema(
    query: str,
    response_schema: type[T],
    model=DEFAULT_MODEL,
) -> T | list[T] | None:
    """
    Calls GPT-4.1 with a response schema for structured output.

    LiteLLM automatically handles Pydantic model conversion to JSON schema.
    For list types, wrap in a Pydantic model with a list field.
    """
    # Check if this is a list type (e.g., list[LabelSchema])
    is_list = False
    origin = get_origin(response_schema)
    if origin is not None and origin is list:
        is_list = True
        # For lists, we need to create a wrapper Pydantic model
        args = get_args(response_schema)
        # Get the inner type from the list type arguments
        inner_type_arg = args[0] if args else BaseModel
        # Use cast to help mypy understand the type
        inner_type = cast(type[BaseModel], inner_type_arg)

        # Dynamically create a wrapper model with an items field
        # Note: create_model needs the actual type, not a variable
        # We use type: ignore because mypy doesn't allow variables in type annotations
        WrapperModel = create_model("ResponseWrapper", items=(list[inner_type], ...))  # type: ignore[valid-type]
        pydantic_model = WrapperModel
    else:
        # response_schema is type[T] where T extends BaseModel, so this is safe
        pydantic_model = cast(type[BaseModel], response_schema)

    start_time = time.time()
    truncated_query = (query[:200] + "...") if len(query) > 200 else query
    print(f"  > Calling GPT-4.1 with schema, prompt: '{truncated_query}'")

    try:
        # LiteLLM accepts Pydantic models directly as response_format
        response = completion(
            model=model,
            messages=[{"role": "user", "content": query}],
            response_format=pydantic_model,
            temperature=0,
            num_retries=3,
        )

        print(f"  > GPT-4.1 with schema call took: {time.time() - start_time:.2f}s")

        json_text = response.choices[0].message.content
        if not json_text:
            raise LLMInvalidResponseException()

        # Parse JSON and convert to Pydantic objects
        parsed_data = json.loads(json_text)

        if is_list:
            # Extract items from wrapper
            wrapper = pydantic_model(**parsed_data)
            # Access items attribute with proper typing
            items = getattr(wrapper, "items", [])
            return cast(list[T], items)
        else:
            # response_schema is type[T], so instantiating it returns T
            return response_schema(**parsed_data)

    except Exception as e:
        print(f"An error occurred during predict with schema API call: {e}")
        return None


def format_pdf_with_latex(
    pdf_data: bytes,
    latex_string: str,
    concepts: list[LumiConcept],
    arxiv_id: str = "document",
    version: str = "1",
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
        arxiv_id (str): The arXiv paper ID (for filename).
        version (str): The version of the paper (for filename).
        model (str): The model to call with.

    Returns:
        str: The formatted pdf markdown.
    """
    start_time = time.time()
    prompt = prompts.make_import_pdf_prompt(concepts)
    truncated_prompt = (prompt[:200] + "...") if len(prompt) > 200 else prompt
    print(f"  > Calling GPT-4.1 to format PDF, prompt: '{truncated_prompt}'")

    pdf_base64 = base64.b64encode(pdf_data).decode("utf-8")

    # Build content array: PDF first, then optional LaTeX, then prompt
    # Using OpenAI's file parsing format (not document_url which is for Gemini)
    content = [
        {
            "type": "file",
            "file": {
                "filename": f"{arxiv_id}v{version}.pdf",
                "file_data": f"data:application/pdf;base64,{pdf_base64}",
            },
        }
    ]

    if latex_string:
        content.append({"type": "text", "text": f"LaTeX Source:\n{latex_string}"})

    content.append({"type": "text", "text": prompt})

    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": content}],
            temperature=0,
            stop=[L_REFERENCES_END],
            num_retries=3,
        )

        print(f"  > GPT-4.1 format PDF call took: {time.time() - start_time:.2f}s")

        response_text = response.choices[0].message.content
        if not response_text:
            raise LLMInvalidResponseException()

        # Post-processing for reference section
        if (
            L_REFERENCES_START in response_text
            and L_REFERENCES_END not in response_text
        ):
            response_text += L_REFERENCES_END

        return cast(str, response_text)

    except Exception as e:
        logger.error(f"LiteLLM PDF processing error: {e}")
        raise LLMInvalidResponseException() from e
