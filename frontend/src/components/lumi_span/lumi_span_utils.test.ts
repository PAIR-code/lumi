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
import { InnerTag, InnerTagName } from '../../shared/lumi_doc';
import { flattenTags } from './lumi_span_utils';

describe('lumi_span_utils', () => {
  describe('flattenTags', () => {
    it('should return an empty array if given an empty array', () => {
      expect(flattenTags([])).to.deep.equal([]);
    });

    it('should handle a flat list of tags without children', () => {
      const tags: InnerTag[] = [
        {
          tagName: InnerTagName.BOLD,
          position: { startIndex: 0, endIndex: 4 },
          metadata: {},
          children: undefined,
        },
        {
          tagName: InnerTagName.ITALIC,
          position: { startIndex: 5, endIndex: 10 },
          metadata: {},
          children: undefined,
        },
      ];
      expect(flattenTags(tags)).to.deep.equal(tags);
    });

    it('should flatten a single level of nested tags', () => {
      const tags: InnerTag[] = [
        {
          tagName: InnerTagName.BOLD,
          position: { startIndex: 10, endIndex: 30 },
          metadata: {},
          children: [
            {
              tagName: InnerTagName.ITALIC,
              position: { startIndex: 5, endIndex: 10 }, // Relative to bold tag
              metadata: {},
            },
          ],
        },
      ];

      const flattened = flattenTags(tags);
      expect(flattened).to.have.lengthOf(2);

      // Check parent tag
      expect(flattened[0].tagName).to.equal(InnerTagName.BOLD);
      expect(flattened[0].position).to.deep.equal({
        startIndex: 10,
        endIndex: 30,
      });

      // Check child tag (position should be absolute now)
      expect(flattened[1].tagName).to.equal(InnerTagName.ITALIC);
      expect(flattened[1].position).to.deep.equal({
        startIndex: 15, // 10 (parent offset) + 5 (child relative)
        endIndex: 20, // 10 (parent offset) + 10 (child relative)
      });
    });

    it('should flatten multiple levels of nested tags', () => {
      const tags: InnerTag[] = [
        {
          // Level 0: <b> (10-50)
          tagName: InnerTagName.BOLD,
          position: { startIndex: 10, endIndex: 50 },
          metadata: {},
          children: [
            {
              // Level 1: <i> (5-25 relative to b, so 15-35 absolute)
              tagName: InnerTagName.ITALIC,
              position: { startIndex: 5, endIndex: 25 },
              metadata: {},
              children: [
                {
                  // Level 2: <u> (2-8 relative to i, so 17-23 absolute)
                  tagName: InnerTagName.UNDERLINE,
                  position: { startIndex: 2, endIndex: 8 },
                  metadata: {},
                },
              ],
            },
            {
              // Level 1: <a> (30-35 relative to b, so 40-45 absolute)
              tagName: InnerTagName.A,
              position: { startIndex: 30, endIndex: 35 },
              metadata: {},
            },
          ],
        },
      ];

      const flattened = flattenTags(tags);
      expect(flattened).to.have.lengthOf(4);

      // Order can be important for rendering, but the logic produces a depth-first traversal order.
      const boldTag = flattened.find((t) => t.tagName === InnerTagName.BOLD);
      const italicTag = flattened.find(
        (t) => t.tagName === InnerTagName.ITALIC
      );
      const underlineTag = flattened.find(
        (t) => t.tagName === InnerTagName.UNDERLINE
      );
      const linkTag = flattened.find((t) => t.tagName === InnerTagName.A);

      expect(boldTag?.position).to.deep.equal({
        startIndex: 10,
        endIndex: 50,
      });
      expect(italicTag?.position).to.deep.equal({
        startIndex: 15,
        endIndex: 35,
      });
      expect(underlineTag?.position).to.deep.equal({
        startIndex: 17,
        endIndex: 23,
      });
      expect(linkTag?.position).to.deep.equal({
        startIndex: 40,
        endIndex: 45,
      });
    });
  });
});
