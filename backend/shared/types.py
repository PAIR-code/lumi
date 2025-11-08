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


from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Optional


class LoadingStatus(StrEnum):
    """
    An enumeration to represent various loading states while importing a LumiDoc.
    """

    UNSET = "UNSET"
    WAITING = "WAITING"  # Importing paper into LumiDoc
    SUMMARIZING = "SUMMARIZING"  # Loading summaries after paper is imported
    SUCCESS = "SUCCESS"
    ERROR_DOCUMENT_LOAD = "ERROR_DOCUMENT_LOAD"
    ERROR_DOCUMENT_LOAD_INVALID_RESPONSE = "ERROR_DOCUMENT_LOAD_INVALID_RESPONSE"
    ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED = "ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED"
    ERROR_SUMMARIZING = "ERROR_SUMMARIZING"
    ERROR_SUMMARIZING_QUOTA_EXCEEDED = "ERROR_SUMMARIZING_QUOTA_EXCEEDED"
    ERROR_SUMMARIZING_INVALID_RESPONSE = "ERROR_SUMMARIZING_INVALID_RESPONSE"
    TIMEOUT = "TIMEOUT"


# Kept in sync with shared/lumi_doc.ts
@dataclass
class FeaturedImage:
    """Class for featured image."""

    image_storage_path: str


@dataclass
class MetadataCollectionItem:
    """Class for metadata collection item."""

    metadata: "ArxivMetadata"
    featured_image: Optional["FeaturedImage"] = None


@dataclass
class ThrottleCollectionItem:
    """Class for throttle collection item."""

    timestamp: Any  # Firestore timestamp created with firestore_v1.SERVER_TIMESTAMP
    succeeded: bool


@dataclass
class ArxivMetadata:
    """Class for paper metadata from arxiv."""

    paper_id: str
    version: str
    authors: list[str]
    title: str
    summary: str  # the paper abstract
    updated_timestamp: str
    published_timestamp: str

    def __eq__(self, other):
        if not isinstance(other, ArxivMetadata):
            return False

        if len(self.authors) != len(other.authors):
            return False
        for i in range(len(self.authors)):
            if self.authors[i] != other.authors[i]:
                return False
        return (
            self.paper_id == other.paper_id
            and self.version == other.version
            and self.title == other.title
            and self.summary == other.summary
            and self.updated_timestamp == other.updated_timestamp
            and self.published_timestamp == other.published_timestamp
        )


@dataclass
class ImageMetadata:
    """Class for image metadata."""

    storage_path: str
    width: float
    height: float


@dataclass
class TableMetadata:
    """Class for image metadata."""

    html_string: str
    page_number: int
    accuracy: float
