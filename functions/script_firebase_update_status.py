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
import sys
import time

from firebase_admin import firestore
import main as functions_main
from shared.types import LoadingStatus


def update_paper_statuses(db, paper_ids_file, new_status, delay):
    """
    Updates the loading_status for a list of papers in Firestore.
    """
    try:
        with open(paper_ids_file, "r") as f:
            paper_ids = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"❌ Error: The file at '{paper_ids_file}' was not found.")
        sys.exit(1)

    if not paper_ids:
        print("No paper IDs found in the file. Exiting.")
        return

    print(f"Found {len(paper_ids)} paper IDs to update to status '{new_status}'.")

    papers_ref = db.collection(functions_main._ARXIV_DOCS_COLLECTION)

    for paper_id in paper_ids:
        try:
            doc_ref = papers_ref.document(paper_id)
            doc = doc_ref.get()

            if not doc.exists:
                print(
                    f"⚠️ Warning: Document for paper ID '{paper_id}' not found. Skipping."
                )
                continue

            versions_ref = doc_ref.collection("versions")
            # Query for the first version to get its loadingStatus.
            # As there's no specific "first" version field, we find any document
            # in the subcollection that has the loadingStatus field.
            first_version_query = versions_ref.where("loadingStatus", "!=", None).limit(
                1
            )
            first_version_docs = list(first_version_query.stream())

            if not first_version_docs:
                print(
                    f"  -> ⚠️ Warning: No versions with a loadingStatus found for {doc_ref.id}. Skipping."
                )
                continue

            first_version_doc = first_version_docs[0]
            first_version_data = first_version_doc.to_dict()
            current_status = first_version_data.get("loadingStatus")

            if current_status == new_status:
                print(
                    f"⚠️ Warning: Paper '{paper_id}' already has status '{new_status}'. Skipping."
                )
                continue
            first_version_doc.reference.update({"loadingStatus": new_status})
            print(f"✅ Successfully updated status for '{paper_id}' to '{new_status}'.")

            if delay > 0:
                print(f"⏳ Waiting {delay} seconds before continuing")
                time.sleep(delay)

        except Exception as e:
            print(f"❌ Failed to update status for '{paper_id}'. Error: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update the loading_status for papers in Firestore."
    )
    parser.add_argument(
        "--paper_ids_file",
        required=True,
        help="Path to a .txt file containing a list of paper IDs, one per line.",
    )
    parser.add_argument(
        "--status",
        required=True,
        choices=[s.value for s in LoadingStatus],
        help="The new LoadingStatus to set for the papers.",
    )
    parser.add_argument(
        "--delay",
        default=0,
        help="How many seconds to wait between paper imports",
    )
    args = parser.parse_args()

    update_paper_statuses(
        db=firestore.client(),
        paper_ids_file=args.paper_ids_file,
        new_status=args.status,
        delay=args.delay,
    )
