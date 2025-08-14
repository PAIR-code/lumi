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
import sys

from shared.types import LoadingStatus


def list_all_statuses():
    """
    Iterates through all LoadingStatus enum members and runs the
    `script_firebase_list.py` script for each status.
    """
    for status in LoadingStatus:
        print("=======================================================")
        print(f"🔎 Checking status: {status.value}")
        print("=======================================================")
        command = [
            sys.executable,
            "script_firebase_list.py",
            "--loading_status",
            status.value,
        ]
        try:
            subprocess.run(command, check=True, text=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Error running script for status {status.value}: {e}")
        except FileNotFoundError:
            print(
                "❌ Error: 'script_firebase_list.py' not found. "
                "Ensure you are in the 'functions' directory."
            )
            sys.exit(1)


if __name__ == "__main__":
    list_all_statuses()