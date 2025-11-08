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
from dataclasses import dataclass, field


@dataclass
class ArxivCollection:
    """
    Dataclass representing the metadata for a Lumi collection.
    This mirrors the ArxivCollection interface in the frontend.
    """

    # To be used for Lumi URL, e.g., /collections/{id}
    collection_id: str
    title: str
    summary: str
    # Ordered list of arXiv paper IDs to include in collection
    paper_ids: list[str] = field(default_factory=list)
    # Collections are rendered on Lumi homepage from highest to lowest priority
    # (e.g., 10, 9, 8, ..., 3, 2, 1)
    # To hide a collection from the Lumi homepage, set priority to -1
    priority: int = -1
