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
import datetime
import unittest
from unittest.mock import MagicMock, patch

from firebase_functions import https_fn
from google.cloud.firestore_v1 import SERVER_TIMESTAMP


# This patch must be applied before importing the function to be tested
with patch("firebase_admin.initialize_app"):
    from import_pipeline import throttling


class ThrottlingTest(unittest.TestCase):

    @patch("import_pipeline.throttling.firestore")
    def test_check_throttle_success_fewer_than_max_attempts(self, mock_firestore):
        """
        Tests the success scenario where there are fewer attempts than the limit.
        """
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        # Mock the `add` call to return a reference
        mock_doc_ref = MagicMock()
        mock_collection.add.return_value = (None, mock_doc_ref)

        # Mock the `get` call on the new document reference
        mock_new_doc = MagicMock()
        mock_new_doc.get.return_value = datetime.datetime.now(datetime.timezone.utc)
        mock_doc_ref.get.return_value = mock_new_doc

        # Mock the query stream to return 4 documents (less than the max)
        mock_stream = [
            MagicMock() for _ in range(throttling.MAX_IMPORTS_PER_MINUTE - 1)
        ]
        mock_collection.where.return_value.order_by.return_value.limit.return_value.stream.return_value = (
            mock_stream
        )

        # Act
        try:
            throttling.check_throttle()
        except https_fn.HttpsError as e:
            self.fail(f"check_throttle raised HttpsError unexpectedly: {e}")

        # Assert
        mock_collection.add.assert_called_once()
        mock_doc_ref.update.assert_called_once_with(
            {"succeeded": True, "timestamp": SERVER_TIMESTAMP}
        )

    @patch("import_pipeline.throttling.firestore")
    def test_check_throttle_success_outside_time_window(self, mock_firestore):
        """
        Tests the success scenario where the Nth attempt was more than a minute ago.
        """
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        mock_doc_ref = MagicMock()
        mock_collection.add.return_value = (None, mock_doc_ref)

        now = datetime.datetime.now(datetime.timezone.utc)
        mock_new_doc = MagicMock()
        mock_new_doc.get.return_value = now
        mock_doc_ref.get.return_value = mock_new_doc

        # The Nth document is older than 1 minute
        mock_stream = [MagicMock() for _ in range(throttling.MAX_IMPORTS_PER_MINUTE)]
        old_timestamp = now - datetime.timedelta(seconds=61)
        mock_stream[throttling.MAX_IMPORTS_PER_MINUTE - 1].get.return_value = (
            old_timestamp
        )
        mock_collection.where.return_value.order_by.return_value.limit.return_value.stream.return_value = (
            mock_stream
        )

        # Act
        try:
            throttling.check_throttle()
        except https_fn.HttpsError as e:
            self.fail(f"check_throttle raised HttpsError unexpectedly: {e}")

        # Assert
        mock_doc_ref.update.assert_called_once_with(
            {"succeeded": True, "timestamp": SERVER_TIMESTAMP}
        )

    @patch("import_pipeline.throttling.firestore")
    def test_check_throttle_failure_within_time_window(self, mock_firestore):
        """
        Tests the failure scenario where 5 attempts happened within the last minute.
        """
        # Arrange
        mock_db = MagicMock()
        mock_firestore.client.return_value = mock_db
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection

        mock_doc_ref = MagicMock()
        mock_collection.add.return_value = (None, mock_doc_ref)

        now = datetime.datetime.now(datetime.timezone.utc)
        mock_new_doc = MagicMock()
        mock_new_doc.get.return_value = now
        mock_doc_ref.get.return_value = mock_new_doc

        # Mock 5 documents, all recent.
        mock_stream = [MagicMock() for _ in range(throttling.MAX_IMPORTS_PER_MINUTE)]
        recent_timestamp = now - datetime.timedelta(seconds=30)
        mock_stream[throttling.MAX_IMPORTS_PER_MINUTE - 1].get.return_value = (
            recent_timestamp
        )
        mock_collection.where.return_value.order_by.return_value.limit.return_value.stream.return_value = (
            mock_stream
        )

        # Act & Assert
        with self.assertRaises(https_fn.HttpsError) as cm:
            throttling.check_throttle()

        self.assertEqual(
            cm.exception.code, https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED
        )
        mock_doc_ref.update.assert_not_called()
