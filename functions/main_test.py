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
# Standard library imports
import unittest
from dataclasses import asdict
from unittest.mock import patch, ANY, MagicMock

# Third-party library imports
from functions_framework import create_app
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

# Local application imports
# This patch must be applied before importing 'main'
with patch("firebase_admin.initialize_app"):
    from main import (
        get_personal_summary,
        get_arxiv_metadata,
        get_lumi_response,
        request_arxiv_doc_import,
    )
import main_testing_utils
from shared.api import LumiAnswer, LumiAnswerRequest
from shared.json_utils import convert_keys
from shared.lumi_doc import ArxivMetadata
from shared.types_local_storage import PaperData


class TestMainGetPersonalSummary(unittest.TestCase):

    @patch("firebase_admin.initialize_app")
    def setUp(self, initialize_app_mock):
        # Create test clients for each function using functions-framework.
        self.personal_summary_client = create_app(
            "get_personal_summary", "main.py"
        ).test_client()

    @patch("main.personal_summary")
    def test_get_personal_summary(self, mock_summary_module):
        # Arrange: Mock the business logic to return a dataclass instance.
        mock_summary_object = LumiAnswer(
            id="summary1",
            request=LumiAnswerRequest(query="personal summary"),
            response_content=[],
            timestamp=123,
        )
        mock_summary_module.get_personal_summary.return_value = mock_summary_object

        # Arrange: Create realistic data objects.
        mock_doc_obj = main_testing_utils.create_mock_lumidoc()
        mock_past_papers = main_testing_utils.create_mock_paper_data()

        # Arrange: Convert dataclasses to camelCase JSON, simulating the client payload.
        doc_dict = convert_keys(asdict(mock_doc_obj), "snake_to_camel")
        past_papers_dict = [
            convert_keys(asdict(p), "snake_to_camel") for p in mock_past_papers
        ]
        payload = {"doc": doc_dict, "past_papers": past_papers_dict}

        # Act: Send a POST request with the test client.
        response = self.personal_summary_client.post("/", json={"data": payload})

        # Assert: Check for a successful response and print the body on failure.
        self.assertEqual(
            response.status_code,
            200,
            f"Request failed with status {response.status_code}. Body: {response.get_data(as_text=True)}",
        )

        # Assert: Check that the business logic was called with the correct, deserialized objects.
        # We use ANY for the doc because dacite creates a new instance.
        mock_summary_module.get_personal_summary.assert_called_once_with(
            ANY, mock_past_papers
        )

        # Assert: Check the successful response body.
        response_data = response.get_json()
        expected_result = convert_keys(asdict(mock_summary_object), "snake_to_camel")

        # Note: @on_call wraps successful responses in a `result` key.
        self.assertIn("result", response_data)
        self.assertEqual(response_data["result"], expected_result)


class TestMainGetLumiResponse(unittest.TestCase):

    @patch("firebase_admin.initialize_app")
    def setUp(self, initialize_app_mock):
        self.lumi_response_client = create_app(
            "get_lumi_response", "main.py"
        ).test_client()

    @patch("main.firestore")
    @patch("main.answers")
    def test_get_lumi_response(self, mock_answers_module, mock_firestore):
        # Arrange: Mock the business logic to return a LumiAnswer instance.
        mock_request_obj = LumiAnswerRequest(query="What is the abstract?")
        mock_answer_obj = LumiAnswer(
            id="answer1", request=mock_request_obj, response_content=[], timestamp=456
        )
        mock_answers_module.generate_lumi_answer.return_value = mock_answer_obj

        # Arrange: Mock Firestore client
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        # Arrange: Create mock data objects.
        mock_doc_obj = main_testing_utils.create_mock_lumidoc()

        # Arrange: Convert dataclasses to camelCase JSON for the payload.
        doc_dict = convert_keys(asdict(mock_doc_obj), "snake_to_camel")
        request_dict = convert_keys(asdict(mock_request_obj), "snake_to_camel")
        payload = {"doc": doc_dict, "request": request_dict}

        # Act: Send a POST request to the test client.
        response = self.lumi_response_client.post("/", json={"data": payload})

        # Assert: Check for a successful response.
        self.assertEqual(
            response.status_code,
            200,
            f"Request failed with status {response.status_code}. Body: {response.get_data(as_text=True)}",
        )

        # Assert: Check that the business logic was called with the correct, deserialized objects.
        # Using ANY for the doc object as it's deserialized into a new instance.
        mock_answers_module.generate_lumi_answer.assert_called_once_with(
            ANY, mock_request_obj
        )

        # Assert: Check the response body.
        response_data = response.get_json()
        expected_result = convert_keys(asdict(mock_answer_obj), "snake_to_camel")
        self.assertIn("result", response_data)
        self.assertEqual(response_data["result"], expected_result)

        # Assert: Check that the logging function was called correctly
        mock_firestore.client.assert_called_once()
        mock_db.collection.assert_called_once_with("query_logs")
        expected_log_data = {
            "created_timestamp": SERVER_TIMESTAMP,
            "answer": asdict(mock_answer_obj),
            "arxiv_id": mock_doc_obj.metadata.paper_id,
            "version": str(mock_doc_obj.metadata.version),
        }
        mock_collection.add.assert_called_once_with(expected_log_data)

    def test_get_lumi_response_query_too_long(self):
        # Arrange
        mock_doc_obj = main_testing_utils.create_mock_lumidoc()
        mock_request_obj = LumiAnswerRequest(query="a" * 2000)  # Exceeds max length
        doc_dict = convert_keys(asdict(mock_doc_obj), "snake_to_camel")
        request_dict = convert_keys(asdict(mock_request_obj), "snake_to_camel")
        payload = {"doc": doc_dict, "request": request_dict}

        # Act
        response = self.lumi_response_client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn("Query exceeds max length", response_data["error"]["message"])

    def test_get_lumi_response_highlight_too_long(self):
        # Arrange
        mock_doc_obj = main_testing_utils.create_mock_lumidoc()
        mock_request_obj = LumiAnswerRequest(
            highlight="a" * 100001
        )  # Exceeds max length
        doc_dict = convert_keys(asdict(mock_doc_obj), "snake_to_camel")
        request_dict = convert_keys(asdict(mock_request_obj), "snake_to_camel")
        payload = {"doc": doc_dict, "request": request_dict}

        # Act
        response = self.lumi_response_client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn("Highlight exceeds max length", response_data["error"]["message"])


class TestMainGetArxivMetadata(unittest.TestCase):

    @patch("firebase_admin.initialize_app")
    def setUp(self, initialize_app_mock):
        self.client = create_app("get_arxiv_metadata", "main.py").test_client()

    @patch("main.fetch_utils.fetch_arxiv_metadata")
    def test_get_arxiv_metadata_success(self, mock_fetch):
        # Arrange
        mock_metadata = ArxivMetadata(
            paper_id="1234.5678",
            version="1",
            authors=["Test Author"],
            title="Test Title",
            summary="Test summary.",
            updated_timestamp="2023-01-01T00:00:00Z",
            published_timestamp="2023-01-01T00:00:00Z",
        )
        mock_fetch.return_value = [mock_metadata]
        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_fetch.assert_called_once_with(arxiv_ids=["1234.5678"])
        response_data = response.get_json()
        expected_result = convert_keys(asdict(mock_metadata), "snake_to_camel")
        self.assertIn("result", response_data)
        self.assertEqual(response_data["result"], expected_result)

    @patch("main.fetch_utils.fetch_arxiv_metadata")
    def test_get_arxiv_metadata_not_found(self, mock_fetch):
        # Arrange
        mock_fetch.return_value = []
        payload = {"arxiv_id": "0000.0000"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 404)
        mock_fetch.assert_called_once_with(arxiv_ids=["0000.0000"])
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "NOT_FOUND")

    def test_get_arxiv_metadata_invalid_argument(self):
        # Arrange: No arxiv_id in payload
        payload = {}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")

    def test_get_arxiv_metadata_incorrect_length(self):
        # Arrange: arxiv_id too long
        payload = {"arxiv_id": "1" * 100}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn("Incorrect arxiv_id length", response_data["error"]["message"])


class TestMainRequestArxivDocImport(unittest.TestCase):
    @patch("firebase_admin.initialize_app")
    def setUp(self, initialize_app_mock):
        self.client = create_app("request_arxiv_doc_import", "main.py").test_client()

    @patch("main._try_doc_write")
    @patch("main.fetch_utils.fetch_arxiv_metadata")
    @patch("main.fetch_utils.check_arxiv_license")
    def test_request_arxiv_doc_import_success(
        self, mock_check_license, mock_fetch_metadata, mock_try_doc_write
    ):
        # Arrange
        mock_check_license.return_value = None
        mock_metadata = main_testing_utils.create_mock_arxiv_metadata()
        mock_fetch_metadata.return_value = [mock_metadata]
        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_check_license.assert_called_once_with("1234.5678")
        mock_fetch_metadata.assert_called_once_with(arxiv_ids=["1234.5678"])
        mock_try_doc_write.assert_called_once_with(mock_metadata, None)
        response_data = response.get_json()
        expected_result = {
            "metadata": convert_keys(asdict(mock_metadata), "snake_to_camel"),
            "error": None,
        }
        self.assertEqual(response_data["result"], expected_result)

    @patch("main.fetch_utils.check_arxiv_license")
    def test_request_arxiv_doc_import_license_failure(self, mock_check_license):
        # Arrange
        error_message = "No valid license found."
        mock_check_license.side_effect = ValueError(error_message)
        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_check_license.assert_called_once_with("1234.5678")
        response_data = response.get_json()
        self.assertEqual(
            response_data["result"], {"error": error_message, "metadata": None}
        )

    def test_request_arxiv_doc_import_incorrect_length(self):
        # Arrange: arxiv_id too long
        payload = {"arxiv_id": "1" * 100}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn("Incorrect arxiv_id length", response_data["error"]["message"])
