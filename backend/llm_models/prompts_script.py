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

import os
import sys

# Add the project root to sys.path to allow imports like 'models.extract_concepts'
script_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.insert(0, project_root)

from llm_models import prompts  # noqa: E402

if __name__ == "__main__":
    print("Prompt for pdf import...")
    print(prompts.make_import_pdf_prompt([]))

    print("Prompt for answers...")
    print(
        prompts.LUMI_PROMPT_DEFINE.format(
            spans_string="spans", highlight="highlight", history_string="history"
        )
    )
