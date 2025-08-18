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
from dataclasses import asdict
from firebase_admin import firestore
from firebase_functions import https_fn
from google.cloud.firestore_v1 import SERVER_TIMESTAMP, FieldFilter, Query

from shared.firebase_constants import THROTTLE_COLLECTION_NAME
from shared.types import ThrottleCollectionItem
from shared.json_utils import convert_keys

MAX_IMPORTS_PER_MINUTE = 5


def check_throttle():
    """
    Checks if the number of import requests has exceeded the limit.

    This function adds a document to the 'import_attempts' collection for each
    request. It then queries the last 5 successful attempts to determine if the
    rate limit of 5 requests per minute has been exceeded.

    Raises:
        https_fn.HttpsError: If the rate limit is exceeded, a
        'RESOURCE_EXHAUSTED' error is thrown.
    """
    db = firestore.client()
    collection_ref = db.collection(THROTTLE_COLLECTION_NAME)

    # Write a new attempt record
    throttle_item = ThrottleCollectionItem(timestamp=SERVER_TIMESTAMP, succeeded=False)
    throttle_item_dict = convert_keys(asdict(throttle_item), "snake_to_camel")

    _, new_doc_ref = collection_ref.add(throttle_item_dict)
    new_doc = new_doc_ref.get()
    current_timestamp = new_doc.get("timestamp")

    # Query for the most recent MAX_IMPORTS_PER_MINUTE attempts
    query = (
        collection_ref.where(filter=FieldFilter("succeeded", "==", True))
        .order_by("timestamp", direction=Query.DESCENDING)
        .limit(MAX_IMPORTS_PER_MINUTE)
        .stream()
    )
    recent_attempts = list(query)

    def _update_success():
        throttle_item = ThrottleCollectionItem(
            timestamp=SERVER_TIMESTAMP, succeeded=True
        )
        throttle_item_dict = convert_keys(asdict(throttle_item), "snake_to_camel")
        new_doc_ref.update(throttle_item_dict)

    if len(recent_attempts) < MAX_IMPORTS_PER_MINUTE:
        # Not enough attempts to be throttled
        _update_success()
        return

    oldest_recent_attempt = recent_attempts[MAX_IMPORTS_PER_MINUTE - 1]
    oldest_recent_timestamp = oldest_recent_attempt.get("timestamp")

    time_difference = current_timestamp - oldest_recent_timestamp

    if time_difference.total_seconds() > 60:
        _update_success()
        return
    else:
        # Throttle since too many attempts have occurred within the last minute.
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            message="Too many import requests. Please try again in a minute.",
        )
