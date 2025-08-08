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

import subprocess
import argparse
import os

# Imports a set of papers for locally debugging.

# 1. Setup and Configuration
# Define the list of papers to import.
# The key is the arXiv ID, and the value is the version.
PAPERS_TO_IMPORT = {
    "2410.18808": "1",
    "2406.10252": "1",
    "2405.17767": "3",
    "2309.12864": "1",
    "2506.09018": "1",
    "2406.09403": "3",
}


def import_papers(args):
    """
    Iterates through PAPERS_TO_IMPORT and calls the main import script for each.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_script_path = os.path.join(script_dir, "..", "functions/import_test_script.py")

    # 3. Main Loop
    for arxiv_id, version in PAPERS_TO_IMPORT.items():
        print(f"--- Processing {arxiv_id}v{version} ---")

        # Construct the base command
        command = ["python3", main_script_path, arxiv_id, version]

        # 4. Flag Handling
        if args.skip_summaries:
            command.append("--skip_summaries")
        if args.debug:
            command.append("--debug")

        # 6. Subprocess Execution and Error Handling
        try:
            print(f"Executing: {' '.join(command)}")
            result = subprocess.run(command, check=True, text=True, capture_output=True)
            print(result.stdout)
            print(f"✅ Successfully imported {arxiv_id}v{version}.")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to import {arxiv_id}v{version}.")
            print(f"   Stdout: {e.stdout}")
            print(f"   Stderr: {e.stderr}")
        except FileNotFoundError:
            print(f"❌ Error: Script at '{main_script_path}' not found.")
            # Stop if the main script is missing
            break
        except Exception as e:
            print(f"❌ An unexpected error occurred for {arxiv_id}v{version}: {e}")

        print("-" * (50))


# 7. Script Execution Block
if __name__ == "__main__":
    # 2. Argument Parsing
    parser = argparse.ArgumentParser(
        description="Batch import script for arXiv papers."
    )
    parser.add_argument(
        "--skip_summaries",
        action="store_true",
        help="Pass the --skip_summaries flag to the main import script.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Pass the --debug flag to the main import script.",
    )

    args = parser.parse_args()
    import_papers(args)
