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

import unittest

from shared import string_utils


class StringUtilsTest(unittest.TestCase):
    def test_get_versioned_id(self):
        with self.subTest("correct inputs"):
            arxiv_id = "1706.03762"
            version = "7"
            expected = "1706.03762v7"
            self.assertEqual(string_utils.get_versioned_id(arxiv_id, version), expected)

        with self.subTest("empty version"):
            arxiv_id = "1706.03762"
            version = ""
            with self.assertRaises(ValueError):
                string_utils.get_versioned_id(arxiv_id, version)

        with self.subTest("empty id"):
            arxiv_id = ""
            version = "7"
            with self.assertRaises(ValueError):
                string_utils.get_versioned_id(arxiv_id, version)

    def test_get_id_and_version_standard(self):
        with self.subTest("correct inputs"):
            versioned_id = "1706.03762v7"
            expected_id = "1706.03762"
            expected_version = "7"
            arxiv_id, version = string_utils.get_id_and_version(versioned_id)
            self.assertEqual(arxiv_id, expected_id)
            self.assertEqual(version, expected_version)

        with self.subTest("missing delimeter in input"):
            # Test case where 'v' delimiter is missing
            versioned_id = "1706.03762"
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

        with self.subTest("multiple delimiters"):
            versioned_id = "1706.03762v7v8"
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

        with self.subTest("empty id"):
            versioned_id = "v7"
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

        with self.subTest("empty version"):
            versioned_id = "1706.03762v"
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

        with self.subTest("whitespace in id"):
            versioned_id = "   v7"
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

        with self.subTest("whitespace in version"):
            versioned_id = "1706.03762v   "
            with self.assertRaises(ValueError):
                string_utils.get_id_and_version(versioned_id)

    def test_get_arxiv_versioned_id(self):
        with self.subTest("correct inputs"):
            link = "http://arxiv.org/abs/1706.03762v7"
            versioned_id = string_utils.get_arxiv_versioned_id(link)
            expected_versioned_id = "1706.03762v7"
            self.assertEqual(versioned_id, expected_versioned_id)

        with self.subTest("empty input"):
            link = ""
            with self.assertRaises(ValueError):
                string_utils.get_arxiv_versioned_id(link)

        with self.subTest("invalid input"):
            link = "incorrect_prefix"
            with self.assertRaises(ValueError):
                string_utils.get_arxiv_versioned_id(link)

    def test_extract_json_from_decorator(self):
        with self.subTest("valid json"):
            text = '```json{"key": "value"}```'
            expected_json = '{"key": "value"}'
            self.assertEqual(
                string_utils.extract_json_from_decorator(text), expected_json
            )

        with self.subTest("no json"):
            text = "no json here"
            self.assertEqual(string_utils.extract_json_from_decorator(text), text)

        with self.subTest("missing json prefix"):
            text = '```{"key": "value"}```'
            self.assertEqual(string_utils.extract_json_from_decorator(text), text)


if __name__ == "__main__":
    unittest.main()
