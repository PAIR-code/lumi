import os
import sys

# Add the project root to sys.path to allow imports like 'models.extract_concepts'
script_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.insert(0, project_root)

from models import prompts

if __name__ == "__main__":
    print("Prompt for pdf import...")
    print(prompts.make_import_pdf_prompt([]))

    print("Prompt for answers...")
    print(
        prompts.LUMI_PROMPT_DEFINE.format(
            spans_string="spans", highlight="highlight", history_string="history"
        )
    )
