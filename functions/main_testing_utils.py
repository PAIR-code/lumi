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


from typing import List
from shared.lumi_doc import (
    LumiDoc,
)
from shared.types_local_storage import PaperData
from shared.api import LumiAnswer, LumiAnswerRequest
from shared.types import ArxivMetadata


def create_mock_lumidoc() -> LumiDoc:
    """Creates a mock LumiDoc object for testing."""
    return LumiDoc(
        markdown="Test markdown",
        sections=[],
        concepts=[],
        metadata=ArxivMetadata(
            paper_id="1234.5678",
            version="1",
            authors=["Test Author"],
            title="Test Paper",
            summary="This is a test summary.",
            updated_timestamp="2023-01-01T00:00:00Z",
            published_timestamp="2023-01-01T00:00:00Z",
        ),
    )


def create_mock_arxiv_metadata() -> ArxivMetadata:
    return ArxivMetadata(
        paper_id="past.paper",
        version="2",
        authors=["Past Author"],
        title="A Past Paper",
        summary="This is a summary of a past paper.",
        updated_timestamp="2022-01-01T00:00:00Z",
        published_timestamp="2022-01-01T00:00:00Z",
    )


def create_mock_paper_data() -> List[PaperData]:
    """Creates a list of mock PaperData objects for testing."""
    return [
        PaperData(
            metadata=create_mock_arxiv_metadata(),
            history=[
                LumiAnswer(
                    id="ans1",
                    request=LumiAnswerRequest(query="What is this?"),
                    response_content=[],
                    timestamp=1234567890,
                )
            ],
        )
    ]
