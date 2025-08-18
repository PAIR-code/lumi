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
import datetime

from firebase_admin import firestore
from google.cloud.firestore_v1.field_path import FieldPath
import main as functions_main
from shared.types import LoadingStatus


def list_docs(db, loading_status, output_file):
    """
    Lists documents from the arxiv_papers collection based on filters.
    """
    try:
        papers_ref = db.collection(functions_main.ARXIV_DOCS_COLLECTION)
        query = papers_ref

        query = query.where("loadingStatus", "==", loading_status)

        docs = query.stream()

        matching_ids = [doc.id for doc in docs]

        if not matching_ids:
            print("No documents found matching the criteria.")
            return

        print("Matching document IDs:")
        for doc_id in matching_ids:
            print(doc_id)
        print("Count:", len(matching_ids))

        if output_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"paper_ids_{loading_status}_{timestamp}.txt"
            with open(filename, "w") as f:
                for doc_id in matching_ids:
                    f.write(f"{doc_id}\n")
            print(f"\n✅ Wrote {len(matching_ids)} IDs to {filename}")

    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="List documents from the arxiv_papers collection in Firestore."
    )
    parser.add_argument(
        "--loading_status",
        choices=[s.value for s in LoadingStatus],
        required=True,
        help="Loading status to filter by.",
    )
    parser.add_argument(
        "--output_file",
        action="store_true",
        help="If set, write the output to a timestamped text file.",
    )
    args = parser.parse_args()

    list_docs(
        db=firestore.client(),
        loading_status=args.loading_status,
        output_file=args.output_file,
    )
