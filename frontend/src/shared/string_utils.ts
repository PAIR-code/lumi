/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Utility functions for processing strings
/**
 * Parses a string of the form "key: value" into a key and value.
 */
export function parseColonKeyValue(originalString: string): {
  key: string;
  value: string;
} {
  const split = originalString.split(":");
  const key = split[0].trim();
  const value = split.slice(1).join(":").trim();
  return { key, value };
}
