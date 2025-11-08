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

import re
from collections.abc import Callable

# Checks that from the start (^) to end ($) of line, all characters are
# lower or uppercase letters, or underscores.
VALID_KEY_REGEX = r"^[a-zA-Z_]*$"


def snake_to_camel(snake_str: str) -> str:
    """Converts a snake_case string to camelCase."""
    if not re.match(VALID_KEY_REGEX, snake_str):
        raise ValueError("Invalid key. Must contain only letters and underscores.")
    components = snake_str.split("_")
    # Capitalize the first letter of each component except the first one
    # and join them to form the camelCase string.
    return components[0] + "".join(x.title() for x in components[1:])


def camel_to_snake(camel_str: str) -> str:
    """Converts a camelCase string to snake_case."""
    if not re.match(VALID_KEY_REGEX, camel_str):
        raise ValueError("Invalid key. Must contain only letters and underscores.")

    # `([a-z])([A-Z])`: Finds an uppercase letter that follows a lowercase letter.
    # We inserts an underscore between the two captured groups, and lowercases
    # the entire string.
    # This also works for consecutive letters like itemID (itemID => item_ID => item_id)
    return re.sub("([a-z])([A-Z])", r"\1_\2", camel_str).lower()


def _convert_keys_recursive(obj, key_converter: Callable[[str], str]):
    """
    Recursively converts dictionary keys using the provided key_converter function.
    Handles nested dictionaries and lists of dictionaries.
    """
    if isinstance(obj, dict):
        return {
            key_converter(key): _convert_keys_recursive(value, key_converter)
            for key, value in obj.items()
        }
    elif isinstance(obj, list):
        return [_convert_keys_recursive(elem, key_converter) for elem in obj]
    else:
        return obj


def convert_keys(obj, case: str):
    """
    Recursively converts dictionary keys to a specified case ('camel_to_snake' or 'snake_to_camel').
    """
    if case == "snake_to_camel":
        return _convert_keys_recursive(obj, snake_to_camel)
    elif case == "camel_to_snake":
        return _convert_keys_recursive(obj, camel_to_snake)
    else:
        raise ValueError("case must be 'snake_to_camel' or 'camel_to_snake'")
