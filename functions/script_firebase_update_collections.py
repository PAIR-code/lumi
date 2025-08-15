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
import argparse
from dataclasses import asdict

from firebase_admin import firestore
import main as functions_main
from shared.json_utils import convert_keys


# Example:
# COLLECTIONS = [
#     ArxivCollection(
#         collection_id="my-first-collection",
#         title="My First Amazing Collection",
#         summary="A collection of papers about amazing things.",
#         paper_ids=["2401.00001", "2401.00002"],
#         priority=10,
#     ),
#     ArxivCollection(
#         collection_id="another-collection",
#         title="Another Collection",
#         summary="This one is also very interesting.",
#         priority=5,
#     ),
# ]

COLLECTIONS = [
    # Add your ArxivCollection objects here.
]


def update_metadata(db, overwrite_paper_ids):
    """
    Updates collection metadata in Firestore from a local config file.
    """
    collections_to_update = COLLECTIONS
    if not collections_to_update:
        print("No collections found in update_collections_config.py. Exiting.")
        return

    print(f"Found {len(collections_to_update)} collections to update.")

    collection_ref = db.collection(functions_main._ARXIV_COLLECTIONS_COLLECTION)

    for collection_obj in collections_to_update:
        try:
            print(f"--- Processing collection: {collection_obj.collection_id} ---")
            data = asdict(collection_obj)

            if not overwrite_paper_ids:
                # Remove paper_ids from the update data to avoid overwriting.
                data.pop("paper_ids", None)
                print(
                    "`overwrite_paper_ids` is False. Will not update paper_ids array."
                )

            # Use set with merge=True to update or create the document
            # without overwriting the entire document.
            data = convert_keys(data, "snake_to_camel")
            collection_ref.document(collection_obj.collection_id).set(data, merge=True)
            print(
                f"✅ Successfully updated metadata for {collection_obj.collection_id}."
            )

        except Exception as e:
            print(
                f"❌ Failed to update metadata for {collection_obj.collection_id}. Error: {e}"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update collection metadata in Firestore."
    )
    parser.add_argument(
        "--overwrite_paper_ids",
        action="store_true",
        help="If set, will overwrite the paper_ids array in the collection. Defaults to False.",
    )
    args = parser.parse_args()

    update_metadata(db=firestore.client(), overwrite_paper_ids=args.overwrite_paper_ids)
