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

import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup
from shared import string_utils
from shared.types import ArxivMetadata

VALID_LICENSES = {
    "creativecommons.org/licenses/by/4.0/",
    "creativecommons.org/licenses/by-sa/4.0/",
    "creativecommons.org/share-your-work/public-domain/cc0/",
}

INVALID_LICENSE = {
    "arxiv.org/licenses/nonexclusive-distrib/1.0/",
}


def check_arxiv_license(arxiv_id: str) -> None:
    """
    Checks the license of an arXiv paper from its abstract page.

    Args:
        arxiv_id (str): The arXiv paper ID.

    Raises:
        ValueError: If an invalid license is found, or if no valid license is found.

    Note:
        Set SKIP_LICENSE_CHECK=true in .env or in config.py to bypass license checking for local development.
    """
    # Import here to avoid circular imports
    from config import settings

    # Skip license check if configured
    if settings.SKIP_LICENSE_CHECK:
        return

    url = f"https://arxiv.org/abs/{arxiv_id}"
    response = requests.get(url)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    all_hrefs = [a_tag.get("href", "") for a_tag in soup.find_all("a")]

    for href in all_hrefs:
        for invalid in INVALID_LICENSE:
            if invalid in href:
                raise ValueError(
                    "Paper has a non-exclusive license and cannot be processed."
                )

    found_license = False
    for href in all_hrefs:
        for valid in VALID_LICENSES:
            if valid in href:
                found_license = True

    if not found_license:
        raise ValueError("No valid license found.")


def fetch_pdf_bytes(url) -> bytes:
    """
    Fetches the content of a given URL.

    Args:
        url (str): The URL to fetch the PDF from.

    Returns:
        bytes: The content of the URL if the request is successful,
             raises error otherwise.
    """

    response = requests.get(url)
    response.raise_for_status()

    return response.content


def fetch_arxiv_metadata(arxiv_ids: list[str]) -> list[ArxivMetadata]:
    """
    Fetches arXiv metadata for the given ids from the arXiv api.

    Args:
        arxiv_ids (list[str]): The ids to fetch.

    Returns:
        list[ArxivMetadata]: A list of metadata for the given ids.
    """
    params = {"id_list": ",".join(arxiv_ids)}
    response = requests.get("http://export.arxiv.org/api/query", params=params)
    response.raise_for_status()

    xml_content = response.content
    root = ET.fromstring(xml_content)

    arxiv_metadata_list = []
    for entry in root.findall(_format_atom_field("entry")):
        versioned_id = string_utils.get_arxiv_versioned_id(
            entry.find(_format_atom_field("id")).text
        )
        arxiv_id, version = string_utils.get_id_and_version(versioned_id)

        authors = []
        for author in entry.findall(_format_atom_field("author")):
            authors.append(author.find(_format_atom_field("name")).text)

        arxiv_metadata_list.append(
            ArxivMetadata(
                paper_id=arxiv_id,
                version=version,
                authors=authors,
                title=entry.find(_format_atom_field("title")).text,
                summary=entry.find(_format_atom_field("summary")).text.strip(),
                updated_timestamp=entry.find(_format_atom_field("updated")).text,
                published_timestamp=entry.find(_format_atom_field("published")).text,
            )
        )
    return arxiv_metadata_list


def _format_atom_field(field_name: str) -> str:
    return "{http://www.w3.org/2005/Atom}" + field_name


def fetch_latex_source(arxiv_id: str, version: str) -> bytes:
    """
    Fetches the LaTeX source as a .tar.gz file from arXiv.

    Args:
        arxiv_id (str): The arXiv paper ID.
        version (str): The version of the paper.

    Returns:
        bytes: The content of the .tar.gz file if the request is successful,
               raises an error otherwise.
    """
    url = f"https://arxiv.org/src/{arxiv_id}v{version}"
    response = requests.get(url)
    response.raise_for_status()

    # Check if the content type indicates a gzipped tarball
    content_type = response.headers.get("Content-Type", "")
    if (
        "application/x-gzip" not in content_type
        and "application/gzip" not in content_type
    ):
        # This can happen if the paper only has a PDF source.
        # Return None to indicate no LaTeX source available
        print(f"⚠️  Paper {arxiv_id}v{version} has no LaTeX source (PDF-only)")
        return None

    return response.content
