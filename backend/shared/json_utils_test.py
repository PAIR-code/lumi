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
from dataclasses import dataclass

from shared import json_utils


@dataclass
class MyData:
    first_name: str
    last_name: str
    age_in_years: int
    is_active_user: bool
    address_info: dict[str, str]
    favorite_numbers: list[int]
    nested_list_of_dicts: list[dict]


class JsonUtilsTest(unittest.TestCase):
    def setUp(self):
        self.snake_dict = {
            "first_name": "John",
            "last_name": "Doe",
            "age_in_years": 30,
            "is_active_user": True,
            "address_info": {"street_name": "Main St", "zip_code": "12345"},
            "favorite_numbers": [1, 2, 3],
            "nested_list_of_dicts": [{"item_id": "a1"}, {"item_id": "b2"}],
        }
        self.camel_dict = {
            "firstName": "John",
            "lastName": "Doe",
            "ageInYears": 30,
            "isActiveUser": True,
            "addressInfo": {"streetName": "Main St", "zipCode": "12345"},
            "favoriteNumbers": [1, 2, 3],
            "nestedListOfDicts": [{"itemId": "a1"}, {"itemId": "b2"}],
        }

    def test_snake_to_camel(self):
        self.assertEqual(json_utils.snake_to_camel("a"), "a")
        self.assertEqual(json_utils.snake_to_camel("first_name"), "firstName")
        self.assertEqual(json_utils.snake_to_camel("_first_name"), "FirstName")
        self.assertEqual(json_utils.snake_to_camel("singleword"), "singleword")
        self.assertEqual(json_utils.snake_to_camel(""), "")
        self.assertEqual(
            json_utils.snake_to_camel("alreadyCamelCase"), "alreadyCamelCase"
        )
        with self.assertRaises(ValueError):
            json_utils.snake_to_camel("invalid-key")
        with self.assertRaises(ValueError):
            json_utils.snake_to_camel("1key")

    def test_camel_to_snake(self):
        self.assertEqual(json_utils.camel_to_snake("a"), "a")
        self.assertEqual(json_utils.camel_to_snake("firstName"), "first_name")
        self.assertEqual(json_utils.camel_to_snake("ageInYears"), "age_in_years")
        self.assertEqual(json_utils.camel_to_snake("singleword"), "singleword")
        self.assertEqual(json_utils.camel_to_snake(""), "")
        self.assertEqual(
            json_utils.camel_to_snake("already_snake_case"), "already_snake_case"
        )
        self.assertEqual(json_utils.camel_to_snake("ItemID"), "item_id")
        self.assertEqual(json_utils.camel_to_snake("itemID"), "item_id")
        with self.assertRaises(ValueError):
            json_utils.camel_to_snake("invalid-key")
        with self.assertRaises(ValueError):
            json_utils.camel_to_snake("1key")

    def test_convert_keys_generic(self):
        # Test to camel
        camel_dict_from_generic = json_utils.convert_keys(
            self.snake_dict, case="snake_to_camel"
        )
        self.assertEqual(camel_dict_from_generic, self.camel_dict)

        # Test to snake
        snake_dict_from_generic = json_utils.convert_keys(
            self.camel_dict, case="camel_to_snake"
        )
        self.assertEqual(snake_dict_from_generic, self.snake_dict)

        # Test invalid case
        with self.assertRaises(ValueError):
            json_utils.convert_keys({}, case="invalid_case")


if __name__ == "__main__":
    unittest.main()
