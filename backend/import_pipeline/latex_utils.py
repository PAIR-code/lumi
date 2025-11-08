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

import io
import os
import re
import tarfile
import warnings

from import_pipeline import latex_inline_command

PREFERRED_MAIN_FILE_NAMES = ["main.tex", "ms.tex"]


def extract_tar_gz(source_bytes: bytes, destination_path: str):
    """
    Unpacks a .tar.gz file from bytes into a destination directory.

    Args:
        source_bytes (bytes): The byte content of the .tar.gz file.
        destination_path (str): The path to the directory where contents will be extracted.
    """
    with io.BytesIO(source_bytes) as byte_stream:
        with tarfile.open(fileobj=byte_stream, mode="r:gz") as tar:
            tar.extractall(path=destination_path)


def find_main_tex_file(source_path: str) -> str:
    """
    Identifies the root .tex file in an extracted LaTeX source directory.

    The main file is identified by the presence of `\\documentclass`.

    Args:
        source_path (str): The path to the directory containing the extracted .tex files.

    Returns:
        str: The full path to the main .tex file.

    Raises:
        ValueError: If zero or more than one .tex file with `\\documentclass` is found.
    """
    valid_main_paths = []
    for root, _, files in os.walk(source_path):
        for file in files:
            if file.endswith(".tex"):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, encoding="utf-8", errors="ignore") as f:
                        # Read file to check for \documentclass
                        content = f.read()
                        if r"\documentclass" in content:
                            valid_main_paths.append(full_path)
                except Exception:
                    # Ignore files that can't be opened or read
                    continue
    if len(valid_main_paths) == 0:
        raise ValueError(f"Could not find a main .tex file in {source_path}")

    if len(valid_main_paths) > 1:
        # Check for 'main.tex' or 'ms.tex' as a tie-breaker
        preferred_files = [
            p
            for p in valid_main_paths
            if os.path.basename(p) in PREFERRED_MAIN_FILE_NAMES
        ]
        if len(preferred_files) == 1:
            return preferred_files[0]
        raise ValueError(
            f"Found multiple competing main .tex files: {valid_main_paths}"
        )

    return valid_main_paths[0]


def inline_tex_files(
    main_file_path: str,
    max_depth=10,
    remove_comments=False,
    inline_commands=False,
):
    """
    Recursively replaces \\input, \\include, and \\bibliography commands with the
    content of the referenced files.

    Warns if a file specified in the main file cannot be found.

    Args:
        main_file_path (str): The full path to the main .tex file.
        max_depth (int): The maximum recursion depth to prevent infinite loops.
        remove_comments (bool): If True, removes LaTeX comments from the output.
        inline_commands (bool): If True, expands custom command definitions.

    Returns:
        A string with all commands replaced by their file content.
    """
    return _inline_tex_files(
        main_file_path, main_file_path, max_depth, remove_comments, inline_commands
    )


def _inline_tex_files(
    main_file_path: str,
    path_to_read: str,
    max_depth=10,
    remove_comments=False,
    inline_commands=False,
) -> str:
    if max_depth <= 0:
        warnings.warn(
            f"Reached max recursion depth while processing {main_file_path}.",
            stacklevel=2,
        )
        return ""  # Stop recursion

    base_dir = os.path.dirname(main_file_path)
    path_to_read_dir = os.path.dirname(path_to_read)
    content = ""
    try:
        with open(path_to_read, encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except FileNotFoundError as e:
        warnings.warn(
            f"File {path_to_read} not found in inline_tex_files: {e}", stacklevel=2
        )

    # --- Step 1: Inline \input and \include ---
    # Regex explanation:
    # '\\': matches '\'
    # '(?:input|include)': non-capturing group that matches either 'input' or 'include'
    # '\{(.*?)\}': Capturing group that matches any character except \n (.) between 0 and unlimited types,
    #   lazily (*?), between { and }.
    input_pattern = re.compile(r"\\(?:input|include)\{(.*?)\}")

    def input_replacer(match):
        relative_path = match.group(1)
        # Try adding the .tex extension; if it doesn't exist, the next recursive run of inline_text_files
        # will raise the error.
        if not relative_path.endswith(".tex"):
            relative_path += ".tex"

        included_file_path = os.path.normpath(os.path.join(base_dir, relative_path))
        # Pass flags in recursive call
        return _inline_tex_files(
            main_file_path,
            included_file_path,
            max_depth - 1,
            remove_comments,
            inline_commands,
        )

    # Swaps in the latex file content for the matches
    inlined_content = input_pattern.sub(input_replacer, content)

    # --- Step 2: Inline \bibliography ---
    # Regex explanation:
    # '\\bibliography': matches this exact string
    # '\{(.*?)\}': Capturing group that matches any character except \n (.) between 0 and unlimited types,
    #   lazily (*?), between { and }.
    bib_pattern = re.compile(r"\\bibliography\{(.*?)\}")

    def bib_replacer(match):
        bib_name = match.group(1)
        # The compiled bibliography file has a .bbl extension
        bbl_file_path = os.path.normpath(
            os.path.join(path_to_read_dir, f"{bib_name}.bbl")
        )
        bib_file_path = os.path.normpath(
            os.path.join(path_to_read_dir, f"{bib_name}.bib")
        )

        if os.path.exists(bbl_file_path):
            final_path = bbl_file_path
        elif os.path.exists(bib_file_path):
            final_path = bib_file_path
        else:
            try:
                # First, look for any .bbl file
                bbl_files = [
                    f for f in os.listdir(path_to_read_dir) if f.endswith(".bbl")
                ]
                if bbl_files:
                    final_path = os.path.join(path_to_read_dir, bbl_files[0])
                else:
                    # If no .bbl, look for any .bib file
                    bib_files = [
                        f for f in os.listdir(path_to_read_dir) if f.endswith(".bib")
                    ]
                    if bib_files:
                        final_path = os.path.join(path_to_read_dir, bib_files[0])
                    else:
                        raise FileNotFoundError(
                            f"No .bbl or .bib files found in {path_to_read_dir}"
                        )
            except FileNotFoundError:
                raise

        try:
            with open(final_path, encoding="utf-8", errors="ignore") as f:
                return f.read()
        except FileNotFoundError:
            raise

    final_content = bib_pattern.sub(bib_replacer, inlined_content)

    # --- Step 3: Remove comments if requested ---
    if remove_comments:
        # This regex removes two types of comments in two stages:
        # 1. First, remove lines that are *only* comments (with optional leading whitespace).
        #    `^\s*(?<!\\)%.*?\n` matches from the start of a line (`^`), finds optional
        #    whitespace (`\s*`), then a comment that isn't escaped (`(?<!\\)%`),
        #    and consumes the rest of the line including the newline (`.*?\n`).
        #    This removes the entire line.
        #
        # Detailed regex explanations:
        #   (?<!\\)%: This is negative look-behind for '\' such that we match '%' that isn't preceded by '\'
        #   .*?\n: Matches any character except \n one or multiple times (lazy), ending with \n
        content_no_full_line_comments = re.sub(
            r"^\s*(?<!\\)%.*?\n", "", final_content, flags=re.MULTILINE
        )

        # 2. Second, remove inline comments from the remaining lines.
        #    `(?<!\\)%.*?$` (see previous comment for detailed explanation) matches a comment that isn't
        #    escaped and goes to the end of the line (`$`). This removes the comment but leaves the
        #    rest of the line and its original newline character intact.
        final_content = re.sub(
            r"(?<!\\)%.*?$", "", content_no_full_line_comments, flags=re.MULTILINE
        )

    # --- Step 4: Inline custom commands if requested ---
    if inline_commands:
        final_content = latex_inline_command.inline_custom_commands(final_content)

    return final_content
