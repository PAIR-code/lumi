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
import shutil
import tarfile
import tempfile
import unittest

from import_pipeline import latex_utils


class LatexUtilsTest(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        # Clean up the temporary directory
        shutil.rmtree(self.test_dir)

    def test_extract_tar_gz(self):
        """Tests extraction of a gzipped tar archive from bytes."""

        # --- Subtest for successful extraction ---
        with self.subTest(name="successful_extraction"):
            # Create a dummy file and a dummy tar.gz in memory
            file_content = b"dummy file content"
            file_name = "test.txt"

            # Use BytesIO to build the tar.gz in memory
            tar_buffer = io.BytesIO()
            with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
                tarinfo = tarfile.TarInfo(name=file_name)
                tarinfo.size = len(file_content)
                tar.addfile(tarinfo, io.BytesIO(file_content))

            tar_bytes = tar_buffer.getvalue()

            # Call the function to extract the bytes
            destination_path = os.path.join(self.test_dir, "extracted_success")
            os.makedirs(destination_path)
            latex_utils.extract_tar_gz(tar_bytes, destination_path)

            # Verify the file was extracted correctly
            extracted_file_path = os.path.join(destination_path, file_name)
            self.assertTrue(os.path.exists(extracted_file_path))
            with open(extracted_file_path, "rb") as f:
                self.assertEqual(f.read(), file_content)

        # --- Subtest for invalid file ---
        with self.subTest(name="invalid_file"):
            invalid_bytes = b"this is not a tar file"
            destination_path = os.path.join(self.test_dir, "extracted_fail")
            os.makedirs(destination_path)

            # tarfile.open raises tarfile.ReadError for invalid files
            with self.assertRaises(tarfile.ReadError):
                latex_utils.extract_tar_gz(invalid_bytes, destination_path)

            # Make sure the failed extraction was not written to the destination directory.
            extracted_file_path = os.path.join(destination_path, file_name)
            self.assertFalse(os.path.exists(extracted_file_path))

    def test_find_main_tex_file(self):
        """Tests identification of the main .tex file under various conditions."""
        test_cases = [
            (
                "finds_by_documentclass",
                ["paper.tex"],
                r"\documentclass{revtex4-1}",
                "paper.tex",
            ),
            (
                "finds_in_subdirectory",
                ["latex/article.tex"],
                r"\documentclass{article}",
                "latex/article.tex",
            ),
            (
                "raises_error_if_not_found",
                ["intro.tex", "body.tex"],
                "No documentclass here",
                ValueError,
            ),
            (
                "raises_error_if_multiple_main_found",
                ["main.tex", "ms.tex"],
                r"\documentclass{article}",
                ValueError,
            ),
            (
                "raises_error_if_multiple_non_main_found",
                ["doc1.tex", "doc2.tex"],
                r"\documentclass{article}",
                ValueError,
            ),
            (
                "prefers_main_tex_on_tiebreak",
                ["main.tex", "other.tex"],
                r"\documentclass{article}",
                "main.tex",
            ),
        ]

        for name, file_paths, content, expected in test_cases:
            with self.subTest(name=name):
                # Setup: create fresh subdirectory for each subtest
                sub_test_dir = os.path.join(self.test_dir, name)
                os.makedirs(sub_test_dir, exist_ok=True)

                # Write content to all specified files
                for file_path in file_paths:
                    full_path = os.path.join(sub_test_dir, file_path)
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, "w") as f:
                        f.write(content)

                if isinstance(expected, type) and issubclass(expected, Exception):
                    with self.assertRaises(expected):
                        latex_utils.find_main_tex_file(sub_test_dir)
                else:
                    result = latex_utils.find_main_tex_file(sub_test_dir)
                    self.assertEqual(result, os.path.join(sub_test_dir, expected))

                # Cleanup sub-directory
                shutil.rmtree(sub_test_dir)

    def test_inline_tex_files(self):
        """Tests recursive inlining of .tex files."""
        # Setup common files for all subtests
        include_dir = os.path.join(self.test_dir, "includes")
        os.makedirs(include_dir)
        with open(os.path.join(include_dir, "name.tex"), "w") as f:
            f.write("Bob")
        with open(os.path.join(self.test_dir, "part1.tex"), "w") as f:
            f.write(r"Part1 \input{part2.tex} More1")
        with open(os.path.join(self.test_dir, "part2.tex"), "w") as f:
            f.write("Part2")
        with open(os.path.join(self.test_dir, "my_bib.bbl"), "w") as f:
            f.write(r"\bibitem{test} Test Citation.")

        test_cases = {
            "basic_inlining": (
                r"Hello World \input{includes/name.tex}",
                "Hello World Bob",
            ),
            "nested_inlining": (
                r"Start \include{part1} End",
                "Start Part1 Part2 More1 End",
            ),
            "bibliography_inlining": (
                r"Some text. \bibliography{my_bib}",
                r"Some text. \bibitem{test} Test Citation.",
            ),
            "file_not_found": (r"Hello \input{nonexistent} World", "Hello  World"),
        }

        for name, (content, expected) in test_cases.items():
            with self.subTest(name=name):
                main_file_path = os.path.join(self.test_dir, "main.tex")
                with open(main_file_path, "w") as f:
                    f.write(content)

                result = latex_utils.inline_tex_files(main_file_path)
                self.assertEqual(result, expected)

    def test_inline_tex_files_with_comment_removal(self):
        """Tests inlining with comment removal."""
        main_file_path = os.path.join(self.test_dir, "main_comments.tex")
        content = (
            r"Line 1 has text. % This is a comment to be removed." + "\n"
            r"Line 2 has an escaped \% sign that should be kept." + "\n"
            r"   % This is a comment on a new line." + "\n"
            r"Final line."
        )
        expected_with_comments = content
        # The line with just a comment should be removed entirely, including its newline.
        # The inline comment should be removed, but the newline kept.
        expected_without_comments = (
            r"Line 1 has text. " + "\n"
            r"Line 2 has an escaped \% sign that should be kept." + "\n"
            # The line containing "   % This is a comment..." is now gone.
            r"Final line."
        )

        with open(main_file_path, "w") as f:
            f.write(content)

        with self.subTest(name="keep_comments_explicit"):
            result = latex_utils.inline_tex_files(main_file_path, remove_comments=False)
            self.assertEqual(result, expected_with_comments)

        with self.subTest(name="remove_comments"):
            result = latex_utils.inline_tex_files(main_file_path, remove_comments=True)
            self.assertEqual(result, expected_without_comments)

    def test_inline_tex_files_nested_with_subdirs(self):
        """Tests that nested includes with relative paths in subdirectories work correctly."""
        # Create the directory structure:
        # /test_dir/main.tex
        # /test_dir/sub/part1.tex
        # /test_dir/sub/part2.tex
        sub_dir = os.path.join(self.test_dir, "sub")
        os.makedirs(sub_dir)

        main_file_path = os.path.join(self.test_dir, "main.tex")
        part1_path = os.path.join(sub_dir, "part1.tex")
        part2_path = os.path.join(sub_dir, "part2.tex")

        with open(main_file_path, "w") as f:
            # main.tex includes a file from the 'sub' directory
            f.write(r"Main start \input{sub/part1.tex} Main end")

        with open(part1_path, "w") as f:
            # part1.tex includes another file directory
            f.write(r"Part1 start \input{sub/part2.tex} Part1 end")

        with open(part2_path, "w") as f:
            f.write("final content")

        # The current implementation will fail here because it will look for
        # 'part2.tex' in self.test_dir, not in self.test_dir/sub.
        result = latex_utils.inline_tex_files(main_file_path)
        expected = "Main start Part1 start final content Part1 end Main end"
        self.assertEqual(result, expected)

    def test_inline_tex_files_bibliography_fallback(self):
        """Tests the fallback logic for finding bibliography files."""
        main_file_path = os.path.join(self.test_dir, "main.tex")
        main_content = r"Some text. \bibliography{non_existent_bib}"
        with open(main_file_path, "w") as f:
            f.write(main_content)

        # Subtest 1: Fallback to any .bbl file
        with self.subTest(name="fallback_to_bbl"):
            bbl_content = r"\bibitem{another_bbl} Another BBL Citation."
            with open(os.path.join(self.test_dir, "another.bbl"), "w") as f:
                f.write(bbl_content)

            result = latex_utils.inline_tex_files(main_file_path)
            self.assertEqual(result, f"Some text. {bbl_content}")

            # Clean up for the next subtest
            os.remove(os.path.join(self.test_dir, "another.bbl"))

        # Subtest 2: Fallback to any .bib file (when no .bbl exists)
        with self.subTest(name="fallback_to_bib"):
            bib_content = r"@article{another_bib, title={Another Bib}}"
            with open(os.path.join(self.test_dir, "another.bib"), "w") as f:
                f.write(bib_content)

            result = latex_utils.inline_tex_files(main_file_path)
            self.assertEqual(result, f"Some text. {bib_content}")

            # Clean up
            os.remove(os.path.join(self.test_dir, "another.bib"))

        # Subtest 3: Raises FileNotFoundError when no bib/bbl files exist
        with self.subTest(name="filenotfound_error"):
            # Ensure no .bbl or .bib files are present
            self.assertFalse(
                any(f.endswith((".bbl", ".bib")) for f in os.listdir(self.test_dir))
            )
            with self.assertRaises(FileNotFoundError):
                latex_utils.inline_tex_files(main_file_path)


if __name__ == "__main__":
    unittest.main()
