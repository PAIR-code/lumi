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

from firebase_admin import firestore
import main as functions_main


def update_paper_statuses(db, paper_ids_file):
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

    print(f"Found {len(paper_ids)} paper IDs.")

    papers_ref = db.collection(functions_main.ARXIV_DOCS_COLLECTION)

    for paper_id in paper_ids:
        try:
            doc_ref = papers_ref.document(paper_id)
            doc = doc_ref.get()

            if not doc.exists:
                print(
                    f"⚠️ Warning: Document for paper ID '{paper_id}' not found. Skipping."
                )
                continue

            print("ID: ", paper_id, "|| Status: ", doc.to_dict().get("loadingStatus"))

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
    args = parser.parse_args()

    update_paper_statuses(
        db=firestore.client(),
        paper_ids_file=args.paper_ids_file,
    )
