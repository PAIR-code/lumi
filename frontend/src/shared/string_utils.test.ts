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

import { expect } from '@esm-bundle/chai';

import { extractArxivId, parseColonKeyValue } from './string_utils';

describe('string_utils', () => {
  describe('extractArxivId', () => {
    const expectedId = '1511.02799';

    it('should extract ID from a standard pdf link', () => {
      const url = 'https://arxiv.org/pdf/1511.02799';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it('should extract ID from a link with .pdf extension', () => {
      const url = 'https://arxiv.org/pdf/1511.02799.pdf';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it('should extract ID from an abs link', () => {
      const url = 'https://arxiv.org/abs/1511.02799';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it('should extract ID from a src link', () => {
      const url = 'https://arxiv.org/src/1511.02799';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it('should extract ID from a link with a version number', () => {
      const url = 'https://arxiv.org/pdf/1511.02799v3';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it('should extract ID from a link without https://', () => {
      const url = 'arxiv.org/pdf/1511.02799';
      expect(extractArxivId(url)).to.equal(expectedId);
    });

    it("should return null for a URL that does not contain 'arxiv.org'", () => {
      const url = 'https://google.com/foo/bar/1511.02799';
      expect(extractArxivId(url)).to.be.null;
    });

    it('should return null for an invalid URL', () => {
      const url = 'https://google.com/foo/bar';
      expect(extractArxivId(url)).to.be.null;
    });

    it('should return null for an empty string', () => {
      const url = '';
      expect(extractArxivId(url)).to.be.null;
    });

    it('should return null for a string that looks close but is not a valid URL', () => {
      const url = '123.45678';
      expect(extractArxivId(url)).to.be.null;
    });

    it('should return null an id with invalid format', () => {
      const url = 'https://arxiv.org/pdf/15110.2799';
      expect(extractArxivId(url)).to.be.null;
    });

    it('should return null an id with too many numbers', () => {
      const url = 'https://arxiv.org/pdf/1511.027990';
      expect(extractArxivId(url)).to.be.null;
    });
  });

  describe('parseColonKeyValue', () => {
    it('should correctly parse a simple key: value string', () => {
      const input = 'Author: John Doe';
      const result = parseColonKeyValue(input);
      expect(result).to.deep.equal({ key: 'Author', value: 'John Doe' });
    });

    it('should handle extra whitespace', () => {
      const input = '  Title  :   My Awesome Paper  ';
      const result = parseColonKeyValue(input);
      expect(result).to.deep.equal({ key: 'Title', value: 'My Awesome Paper' });
    });

    it('should handle colons in the value', () => {
      const input = 'Note: This is a note: it has two colons';
      const result = parseColonKeyValue(input);
      expect(result).to.deep.equal({
        key: 'Note',
        value: 'This is a note: it has two colons',
      });
    });

    it('should handle an empty value', () => {
      const input = 'Category:';
      const result = parseColonKeyValue(input);
      expect(result).to.deep.equal({ key: 'Category', value: '' });
    });
  });
});
