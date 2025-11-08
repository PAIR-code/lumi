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

import { areArraysEqual } from './utils';
import { expect } from '@esm-bundle/chai';

describe('areArraysEqual', () => {
  it('should return true for two equal arrays of numbers', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2, 3])).to.equal(true);
  });

  it('should return true for two equal arrays of strings', () => {
    expect(areArraysEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).to.equal(true);
  });

  it('should return false for two different arrays of the same length', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2, 4])).to.equal(false);
  });

  it('should return false for two arrays of different lengths', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2])).to.equal(false);
  });

  it('should return true for two empty arrays', () => {
    expect(areArraysEqual([], [])).to.equal(true);
  });

  it('should return false when comparing an empty array to a non-empty array', () => {
    expect(areArraysEqual([], [1])).to.equal(false);
  });
});
