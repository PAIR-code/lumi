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
import os
import time
import unittest
from typing import Any, Dict, List
from unittest.mock import patch

# Third-party library imports
import firebase_admin
from firebase_admin import firestore
from functions_framework import create_app

# Local application imports
# This patch must be applied before importing 'main'
with patch("firebase_admin.initialize_app"):
    from main import _ARXIV_DOCS_COLLECTION, _VERSIONS_COLLECTION
from shared.lumi_doc import ArxivMetadata
from shared.types import LoadingStatus


class TestMainRequestArxivDocImport(unittest.TestCase):
    # @patch("firebase_admin.initialize_app")
    def setUp(self):
        self.client = create_app("request_arxiv_doc_import", "main.py").test_client()
        # Point to the Firestore emulator
        os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
        os.environ["GOOGLE_CLOUD_PROJECT"] = "any-thing"
        os.environ["FUNCTION_RUN_MODE"] = "testing"
        self.db = firestore.client()

        # This patch affects the on_call function which runs in the test process.
        self.fetch_patcher = patch("main.fetch_utils.fetch_arxiv_metadata")
        self.mock_fetch = self.fetch_patcher.start()
        # Ensure the patch is stopped after the test
        self.addCleanup(self.fetch_patcher.stop)

        # The mocks for the triggered function (on_document_written) are
        # controlled by the global `FUNCTION_RUN_MODE` flag in main.py and
        # by passing a `test_config` through the database, so we don't patch
        # `import_pipeline` or `summaries` here.

    def tearDown(self):
        # Clean up any documents created in the test database
        docs = (
            self.db.collection(_ARXIV_DOCS_COLLECTION)
            .document("1234.5678")
            .collection(_VERSIONS_COLLECTION)
            .stream()
        )
        for doc in docs:
            doc.reference.delete()

        if firebase_admin._apps:
            # Get the first initialized app (our named one) and delete it
            app_instance = list(firebase_admin._apps.values())[0]
            firebase_admin.delete_app(app_instance)

    def _poll_for_status(
        self, doc_ref, target_status: LoadingStatus, timeout_sec: int = 15
    ) -> Dict[str, Any]:
        """Polls Firestore for a document to reach a target loading status."""
        start_time = time.time()
        last_seen_status = "DOCUMENT_NOT_FOUND"
        while time.time() - start_time < timeout_sec:
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                current_status = data.get("loadingStatus")
                last_seen_status = current_status
                if current_status == target_status:
                    return data
            time.sleep(0.5)

        self.fail(
            f"Timed out waiting for status '{target_status.value}'. "
            f"Last seen status: {last_seen_status}"
        )

    def test_request_arxiv_doc_import_integration(self):
        # Arrange
        # Mock dependencies of BOTH functions
        mock_metadata = ArxivMetadata(
            paper_id="1234.5678",
            version="1",
            authors=["Test Author"],
            title="Test Title",
            summary="Test summary.",
            updated_timestamp="2023-01-01T00:00:00Z",
            published_timestamp="2023-01-01T00:00:00Z",
        )
        self.mock_fetch.return_value = [mock_metadata]

        payload = {"arxiv_id": "1234.5678"}

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert initial response
        self.assertEqual(response.status_code, 200)

        # Assert the trigger and wait for the result
        doc_ref = (
            self.db.collection(_ARXIV_DOCS_COLLECTION)
            .document("1234.5678")
            .collection(_VERSIONS_COLLECTION)
            .document("1")
        )

        # Poll for each status in sequence to verify the state machine.
        # 1. Verify the on_call function creates the doc with WAITING status.
        waiting_doc = self._poll_for_status(doc_ref, LoadingStatus.WAITING)
        self.assertEqual(waiting_doc["loadingStatus"], LoadingStatus.WAITING)
        print("✅ Status WAITING verified.")

        # 2. Verify the first part of the trigger moves it to SUMMARIZING.
        summarizing_doc = self._poll_for_status(doc_ref, LoadingStatus.SUMMARIZING)
        self.assertEqual(summarizing_doc["loadingStatus"], LoadingStatus.SUMMARIZING)
        print("✅ Status SUMMARIZING verified.")

        # 3. Verify the second part of the trigger moves it to SUCCESS.
        success_doc = self._poll_for_status(doc_ref, LoadingStatus.SUCCESS)
        self.assertEqual(success_doc["loadingStatus"], LoadingStatus.SUCCESS)
        print("✅ Status SUCCESS verified.")

    def test_request_arxiv_doc_import_import_fails(self):
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
        self.mock_fetch.return_value = [mock_metadata]

        # Pass a test_config to instruct the triggered function to fail.
        payload = {
            "arxiv_id": "1234.5678",
            "test_config": {"importBehavior": "fail"},
        }

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert initial response
        self.assertEqual(response.status_code, 200)

        # Assert the trigger and wait for the result
        doc_ref = (
            self.db.collection(_ARXIV_DOCS_COLLECTION)
            .document("1234.5678")
            .collection(_VERSIONS_COLLECTION)
            .document("1")
        )

        # 1. Verify the on_call function creates the doc with WAITING status.
        self._poll_for_status(doc_ref, LoadingStatus.WAITING)
        print("✅ Status WAITING verified.")

        # 2. Verify the trigger moves it to ERROR.
        error_doc = self._poll_for_status(doc_ref, LoadingStatus.ERROR)
        self.assertEqual(error_doc["loadingStatus"], LoadingStatus.ERROR)
        print("✅ Status ERROR verified.")

    def test_request_arxiv_doc_import_summarize_fails(self):
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
        self.mock_fetch.return_value = [mock_metadata]

        # Pass a test_config to instruct the triggered function to fail.
        payload = {
            "arxiv_id": "1234.5678",
            "test_config": {"summaryBehavior": "fail"},
        }

        # Act
        response = self.client.post("/", json={"data": payload})

        # Assert initial response
        self.assertEqual(response.status_code, 200)

        # Assert the trigger and wait for the result
        doc_ref = (
            self.db.collection(_ARXIV_DOCS_COLLECTION)
            .document("1234.5678")
            .collection(_VERSIONS_COLLECTION)
            .document("1")
        )

        # Poll for each status in sequence to verify the state machine.
        self._poll_for_status(doc_ref, LoadingStatus.WAITING)
        print("✅ Status WAITING verified.")
        self._poll_for_status(doc_ref, LoadingStatus.SUMMARIZING)
        print("✅ Status SUMMARIZING verified.")
        error_doc = self._poll_for_status(doc_ref, LoadingStatus.ERROR)
        self.assertEqual(error_doc["loadingStatus"], LoadingStatus.ERROR)
        print("✅ Status ERROR verified.")
