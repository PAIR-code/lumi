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

import re

_ARXIV_ID_PREFIX = "http://arxiv.org/abs/"
_ID_VERSION_DELIMETER = "v"


def get_versioned_id(arxiv_id: str, version: str):
    if not version:
        raise ValueError("Empty version")
    if not arxiv_id:
        raise ValueError("Empty id")

    return f"{arxiv_id}{_ID_VERSION_DELIMETER}{version}"


def get_id_and_version(versioned_id):
    if "v" not in versioned_id:
        raise ValueError("Invalid arxiv link")

    split = versioned_id.split(_ID_VERSION_DELIMETER)
    if len(split) != 2:
        raise ValueError("Could not parse single id and version")

    [arxiv_id, version] = split

    if not arxiv_id.strip() or not version.strip():
        raise ValueError("Parsed invalid id")

    return arxiv_id, version


def get_arxiv_versioned_id(metadata_id_link: str):
    if not metadata_id_link.startswith(_ARXIV_ID_PREFIX):
        raise ValueError("Invalid arxiv link")

    return metadata_id_link[len(_ARXIV_ID_PREFIX) :]


def extract_json_from_decorator(text: str) -> str:
    """
    Extracts JSON content from a string formatted as 'json```{json_content}```'.

    Args:
        text: The input string potentially containing the JSON content.

    Returns:
        The parsed json_content string if found, otherwise returns the original text.
    """
    # (.*?) This capturing group contains: (1) `.` to matches any character (usually except
    # for line terminators, except by passing re.DOTALL we include newlines as well)
    # and (2) *? matches the previous dot token between zero and unlimited times, as
    # few times as possible (lazy).
    pattern = r"```json(.*?)```"

    match = re.search(pattern, text, re.DOTALL)

    if match:
        return match.group(1).strip()
    return text
