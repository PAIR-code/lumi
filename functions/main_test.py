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
from datetime import timedelta, datetime, timezone

# Third-party library imports
from functions_framework import create_app
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from firebase_functions import https_fn

# Local application imports
# This patch must be applied before importing 'main'
with patch("firebase_admin.initialize_app"):
    from main import (
        get_personal_summary,
        get_arxiv_metadata,
        get_lumi_response,
        request_arxiv_doc_import,
        save_user_feedback,
    )
import main_testing_utils
from shared.api import LumiAnswer, LumiAnswerRequest, UserFeedback
from shared.json_utils import convert_keys
from shared.types import ArxivMetadata, MetadataCollectionItem
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
        payload = {"doc": doc_dict, "past_papers": past_papers_dict, "apiKey": ""}

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
            ANY, mock_past_papers, ""
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

    @patch("main.datetime")
    @patch("main.firestore")
    @patch("main.answers")
    def test_get_lumi_response(self, mock_answers_module, mock_firestore, mock_datetime):
        # Arrange: Mock datetime.now to return a fixed time for deterministic testing.
        fixed_now = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_now

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
        payload = {"doc": doc_dict, "request": request_dict, "apiKey": ""}

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
            ANY, mock_request_obj, ""
        )

        # Assert: Check the response body.
        response_data = response.get_json()
        expected_result = convert_keys(asdict(mock_answer_obj), "snake_to_camel")
        self.assertIn("result", response_data)
        self.assertEqual(response_data["result"], expected_result)

        # Assert: Check that the logging function was called correctly
        mock_firestore.client.assert_called_once()
        mock_db.collection.assert_called_once_with("query_logs")
        # 90 days after Jan 15, 2026 = April 15, 2026
        expected_expire_timestamp = datetime(2026, 4, 15, 12, 0, 0, tzinfo=timezone.utc)
        expected_log_data = {
            "created_timestamp": SERVER_TIMESTAMP,
            "expire_timestamp": expected_expire_timestamp,
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

    @patch("main.firestore")
    def test_get_arxiv_metadata_success(self, mock_firestore):
        # Arrange
        mock_metadata = MetadataCollectionItem(
            metadata=ArxivMetadata(
                paper_id="1234.5678",
                version="1",
                authors=["Test Author"],
                title="Test Title",
                summary="Test summary.",
                updated_timestamp="2023-01-01T00:00:00Z",
                published_timestamp="2023-01-01T00:00:00Z",
            ),
        )
        mock_metadata_dict = convert_keys(asdict(mock_metadata), "snake_to_camel")

        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = mock_metadata_dict
        mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )

        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_db.collection.assert_called_once_with("arxiv_metadata")
        mock_db.collection.return_value.document.assert_called_once_with("1234.5678")
        response_data = response.get_json()
        expected_result = convert_keys(asdict(mock_metadata.metadata), "snake_to_camel")
        self.assertIn("result", response_data)
        self.assertEqual(response_data["result"], expected_result)

    @patch("main.firestore")
    def test_get_arxiv_metadata_not_found(self, mock_firestore):
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )
        payload = {"arxiv_id": "0000.0000"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 404)
        mock_db.collection.return_value.document.assert_called_once_with("0000.0000")
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

    @patch("main.throttling.check_throttle")
    @patch("main._try_doc_write")
    @patch("main.fetch_utils.fetch_arxiv_metadata")
    @patch("main.fetch_utils.check_arxiv_license")
    def test_request_arxiv_doc_import_success(
        self,
        mock_check_license,
        mock_fetch_metadata,
        mock_try_doc_write,
        mock_check_throttle,
    ):
        # Arrange
        mock_check_throttle.return_value = None
        mock_check_license.return_value = None
        mock_metadata = main_testing_utils.create_mock_arxiv_metadata()
        mock_fetch_metadata.return_value = [mock_metadata]
        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_check_throttle.assert_called_once()
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
    @patch("main.fetch_utils.fetch_arxiv_metadata")
    @patch("main.throttling.check_throttle")
    def test_request_arxiv_doc_import_throttled(
        self, mock_check_throttle, mock_fetch_arxiv_metadata, mock_check_arxiv_license
    ):
        # Arrange
        mock_check_throttle.side_effect = https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            message="Too many requests",
        )
        mock_metadata = main_testing_utils.create_mock_arxiv_metadata()
        mock_fetch_arxiv_metadata.return_value = [mock_metadata]
        del mock_check_arxiv_license  # unused

        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 429)
        mock_check_throttle.assert_called_once()
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "RESOURCE_EXHAUSTED")

    @patch("main.throttling.check_throttle")
    @patch("main.fetch_utils.check_arxiv_license")
    def test_request_arxiv_doc_import_license_failure(
        self, mock_check_license, mock_check_throttle
    ):
        # Arrange
        mock_check_throttle.return_value = None
        error_message = "No valid license found."
        mock_check_license.side_effect = ValueError(error_message)
        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_check_throttle.assert_not_called()
        mock_check_license.assert_called_once_with("1234.5678")
        response_data = response.get_json()
        self.assertEqual(
            response_data["result"], {"error": error_message, "metadata": None}
        )

    @patch("main.throttling.check_throttle")
    def test_request_arxiv_doc_import_incorrect_length(self, mock_check_throttle):
        # Arrange: arxiv_id too long
        mock_check_throttle.return_value = None
        payload = {"arxiv_id": "1" * 100}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        mock_check_throttle.assert_not_called()
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn("Incorrect arxiv_id length", response_data["error"]["message"])


class TestMainSaveUserFeedback(unittest.TestCase):
    @patch("firebase_admin.initialize_app")
    def setUp(self, initialize_app_mock):
        self.client = create_app("save_user_feedback", "main.py").test_client()

    @patch("main.firestore")
    def test_save_user_feedback_with_arxiv_id(self, mock_firestore):
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        payload = {
            "user_feedback_text": "This is great!",
            "arxiv_id": "1234.5678",
        }

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_firestore.client.assert_called_once()
        mock_db.collection.assert_called_once_with("user_feedback")
        expected_data = {
            "user_feedback_text": "This is great!",
            "created_timestamp": SERVER_TIMESTAMP,
            "arxiv_id": "1234.5678",
        }
        mock_collection.add.assert_called_once_with(expected_data)
        self.assertEqual(response.get_json()["result"], {"status": "success"})

    @patch("main.firestore")
    def test_save_user_feedback_without_arxiv_id(self, mock_firestore):
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        payload = {"user_feedback_text": "This is helpful."}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 200)
        mock_firestore.client.assert_called_once()
        mock_db.collection.assert_called_once_with("user_feedback")
        expected_data = {
            "user_feedback_text": "This is helpful.",
            "created_timestamp": SERVER_TIMESTAMP,
            "arxiv_id": None,
        }
        mock_collection.add.assert_called_once_with(expected_data)
        self.assertEqual(response.get_json()["result"], {"status": "success"})

    def test_save_user_feedback_empty_text(self):
        # Arrange
        payload = {"user_feedback_text": ""}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn(
            "user_feedback_text must not be empty", response_data["error"]["message"]
        )

    def test_save_user_feedback_too_long(self):
        # Arrange
        payload = {"user_feedback_text": "a" * 1001}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert
        self.assertEqual(response.status_code, 400)
        response_data = response.get_json()
        self.assertIn("error", response_data)
        self.assertEqual(response_data["error"]["status"], "INVALID_ARGUMENT")
        self.assertIn(
            "Feedback text exceeds max length", response_data["error"]["message"]
        )
