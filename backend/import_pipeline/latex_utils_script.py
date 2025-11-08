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
import os
import shutil
import sys
import tempfile

# Add the project root to sys.path to allow imports like 'functions.import_pipeline.fetch_utils'
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from import_pipeline import fetch_utils, latex_utils  # noqa: E402


def print_dir_structure(startpath):
    """Prints the directory structure."""
    print(f"\n--- Directory Structure of {startpath} ---")
    for root, _dirs, files in os.walk(startpath):
        level = root.replace(startpath, "").count(os.sep)
        indent = " " * 4 * (level)
        print(f"{indent}{os.path.basename(root)}/")
        subindent = " " * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")
    print("--------------------------------------------------\n")


def main():
    """
    Main function to fetch, extract, and process an arXiv LaTeX source.

    Takes an arXiv ID as a command-line argument, fetches the .tar.gz source,
    extracts it to a temporary directory, finds the main .tex file, inlines
    all includes, and prints the result.
    """
    parser = argparse.ArgumentParser(
        description="Fetch and process arXiv LaTeX source."
    )
    parser.add_argument(
        "arxiv_id", type=str, help="The arXiv ID of the paper (e.g., '2310.06825')."
    )
    parser.add_argument(
        "--version", type=str, default="1", help="The version of the paper."
    )
    parser.add_argument(
        "--inline-commands",
        action="store_true",
        help="If set, expands custom command definitions.",
    )
    args = parser.parse_args()

    temp_dir = tempfile.mkdtemp()
    try:
        # 1. Fetch the LaTeX source using fetch_utils
        print(f"Fetching LaTeX source for {args.arxiv_id}v{args.version}...")
        source_bytes = fetch_utils.fetch_latex_source(args.arxiv_id, args.version)
        print("Fetch successful.")

        # 2. Extract the .tar.gz file
        print(f"Extracting source to temporary directory: {temp_dir}")
        latex_utils.extract_tar_gz(source_bytes, temp_dir)
        print("Extraction complete.")

        # Print the directory structure
        print_dir_structure(temp_dir)

        # 3. Find the main .tex file
        print("Finding main .tex file...")
        main_tex_path = latex_utils.find_main_tex_file(temp_dir)
        print(f"Found main file: {main_tex_path}")

        # 4. Inline all \input and \include statements
        print("Inlining .tex files...")
        try:
            inlined_content = latex_utils.inline_tex_files(
                main_tex_path,
                remove_comments=True,
                inline_commands=args.inline_commands,
            )
            print("Inlining complete.")
        except FileNotFoundError as e:
            print(f"Error: A file to be included could not be found: {e}")
            sys.exit(1)

        print("\n--- Inlined LaTeX Content (first 500 chars) ---")
        print(inlined_content[:500])
        print("...")

        print("\n--- Inlined LaTeX Content (last 500 chars) ---")
        print("...")
        print(inlined_content[-500:])

        # Write the inlined content to a file in the current directory
        output_filename = f"{args.arxiv_id}_inlined.tex"
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write(inlined_content)
        print(f"\nSuccessfully wrote inlined content to: {output_filename}")

    finally:
        # 5. Clean up the temporary directory
        print(f"Cleaning up temporary directory: {temp_dir}")
        shutil.rmtree(temp_dir)


if __name__ == "__main__":
    main()
