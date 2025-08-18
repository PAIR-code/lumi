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
import csv
import time

from firebase_admin import firestore
import main as functions_main


def process_csv(csv_path, db, delay):
    """
    Reads a CSV file and triggers the import process for each paper.

    Args:
        csv_path (str): The path to the input CSV file.
        db: The initialized Firestore client.
    """
    try:
        with open(csv_path, mode="r", encoding="utf-8") as infile:
            reader = csv.DictReader(infile)
            headers = reader.fieldnames
            if "arxiv_id" not in headers or "collection" not in headers:
                print(
                    "❌ Error: CSV file must contain 'arxiv_id' and 'collection' headers."
                )
                return

            for row in reader:
                arxiv_id = row.get("arxiv_id")

                # Skip header row
                if arxiv_id == "arxiv_id":
                    continue

                collection_name = row.get("collection")

                if not arxiv_id or not collection_name:
                    print(f"⚠️ Skipping row due to missing data: {row}")
                    continue

                print(f"--- Processing {arxiv_id} for collection {collection_name} ---")
                try:
                    # 3a. Trigger Paper Import by calling the cloud function
                    functions_main.start_arxiv_doc_import(arxiv_id=arxiv_id)
                    print(f"✅ Successfully triggered import for {arxiv_id}.")

                    # # 3b. Update Collections
                    collection_ref = db.collection(
                        functions_main.ARXIV_COLLECTIONS_COLLECTION
                    ).document(collection_name)
                    collection_ref.set(
                        {"paperIds": firestore.ArrayUnion([arxiv_id])}, merge=True
                    )
                    print(f"✅ Added {arxiv_id} to collection '{collection_name}'.")

                    if int(delay) > 0:
                        print(f"⏳ Waiting {delay} seconds before continuing")
                        time.sleep(delay)

                except Exception as e:
                    # 4. Error Handling
                    print(f"❌ Failed to process {arxiv_id}. Error: {e}")

                print("-" * 50)

    except FileNotFoundError:
        print(f"❌ Error: The file at '{csv_path}' was not found.")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")


if __name__ == "__main__":
    # 1. Setup & Configuration
    parser = argparse.ArgumentParser(
        description="Import papers into Firestore from a CSV file."
    )
    parser.add_argument(
        "--csv_file",
        required=True,
        help="Path to the CSV file with 'arxiv_id' and 'collection' headers.",
    )
    parser.add_argument(
        "--delay",
        default=10,
        type=int,
        help="How many seconds to wait between paper imports",
    )
    args = parser.parse_args()

    # 2. CSV Processing
    process_csv(args.csv_file, firestore.client(), delay=args.delay)
