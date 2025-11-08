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

from shared.utils import get_unique_id


class UtilsTest(unittest.TestCase):
    def test_get_unique_id(self):
        id1 = get_unique_id()
        id2 = get_unique_id()
        self.assertIsInstance(id1, str)
        self.assertNotEqual(id1, id2)
        self.assertEqual(len(id1), 8)


if __name__ == "__main__":
    unittest.main()
