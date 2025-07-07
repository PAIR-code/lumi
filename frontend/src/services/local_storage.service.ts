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

import { Service } from "./service";

/**
 * A service for interacting with the browser's local storage.
 * It automatically prefixes keys to avoid conflicts with other applications.
 */
export class LocalStorageService extends Service {
  /**
   * Retrieves data from local storage.
   * @param key The key for the data (this service does not add a prefix).
   * @param defaultValue The value to return if the key is not found.
   * @returns The stored data or the default value.
   */
  getData<T>(key: string, defaultValue: T): T {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(
        `Error reading from local storage for key "${key}":`,
        error
      );
      return defaultValue;
    }
  }

  /**
   * Saves data to local storage.
   * @param key The key for the data (this service does not add a prefix).
   * @param data The data to store.
   */
  setData<T>(key: string, data: T): void {
    try {
      const serializedData = JSON.stringify(data);
      window.localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error(`Error writing to local storage for key "${key}":`, error);
    }
  }

  /**
   * Deletes data from local storage.
   * @param key The key for the data to delete.
   */
  deleteData(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(
        `Error deleting from local storage for key "${key}":`,
        error
      );
    }
  }

  /**
   * Lists all keys in local storage that start with a given prefix.
   * @param prefix The prefix to search for.
   * @returns An array of keys.
   */
  listKeys(prefix: string): string[] {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
}
