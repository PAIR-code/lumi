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

"""Script for running import pipeline locally

Running this script will import and process an arXiv paper into a LumiDoc, saving it
out to frontend/loaded_documents and saving images to local_image_bucket/{arXiv_id}/...

The paper can then be viewed in storybook by configuring the paper import path
in `lumi_doc.stories.ts`.
"""

import json
import argparse
import time

from dataclasses import asdict
from typing import Tuple

from import_pipeline import fetch_utils, import_pipeline, image_utils, summaries
from models import extract_concepts, gemini
from shared.json_utils import convert_keys


if __name__ == "__main__":
    start_time = time.time()
    last_time = start_time

    parser = argparse.ArgumentParser(
        description="Run import pipeline locally for an arXiv paper."
    )
    parser.add_argument("arxiv_id", type=str, help="The arXiv ID of the paper.")
    parser.add_argument("version", type=str, help="The version of the paper.")
    parser.add_argument(
        "--debug",
        action="store_true",
        help="If true, will log intermediate outputs for debug (e.g. markdown).",
    )
    parser.add_argument(
        "--existing_model_output_file",
        help="If passed, will use this output instead of calling the model.",
    )
    parser.add_argument(
        "--skip_summaries",
        action="store_true",
        help="If true, will skip summary generation.",
    )
    args = parser.parse_args()
    arxiv_id = args.arxiv_id
    version = args.version

    print("🍭 Running import pipeline locally...")
    metadata = fetch_utils.fetch_arxiv_metadata(arxiv_ids=[arxiv_id])

    print(f"  > fetch_arxiv_metadata took: {time.time() - last_time:.2f}s")
    last_time = time.time()

    if not len(metadata):
        raise ValueError
    concepts = extract_concepts.extract_concepts(metadata[0].summary)

    print(f"  > extract_concepts took: {time.time() - last_time:.2f}s")
    last_time = time.time()

    lumi_doc = import_pipeline.import_arxiv_latex_and_pdf(
        arxiv_id,
        version,
        concepts,
        metadata[0],
        args.debug,
        args.existing_model_output_file,
        run_locally=True,
    )

    print(f"  > import_arxiv_latex_and_pdf took: {time.time() - last_time:.2f}s")
    last_time = time.time()

    if args.skip_summaries:
        print("🍭 Skipped summary generation...")
    else:
        print("🍭 Generating summaries...")
        lumi_doc.summaries = summaries.generate_lumi_summaries(lumi_doc)

        print(f"  > generate_lumi_summaries took: {time.time() - last_time:.2f}s")
        last_time = time.time()

    output_path = f"../frontend/src/.examples/paper_{arxiv_id}.ts"
    print(f"🍭 Writing output to: ", output_path)
    with open(output_path, "w+") as file:
        converted_camel = convert_keys(asdict(lumi_doc), "snake_to_camel")
        file_content = f"""import {{ LumiDoc }} from "../shared/lumi_doc";

// Example arxiv document with id `{arxiv_id}` loaded using import script.
export const paper: LumiDoc = {json.dumps(converted_camel)};"""
        file.write(file_content)

    print(f"🍭 Total time: {time.time() - start_time:.2f}s")
