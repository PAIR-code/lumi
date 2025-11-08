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
import { PaperData } from './types_local_storage';
import { sortPaperDataByTimestamp } from './lumi_paper_utils';
import { ArxivMetadata } from './lumi_doc';

// A minimal mock of ArxivMetadata for testing purposes.
const createMockMetadata = (paperId: string): ArxivMetadata => ({
  paperId,
  title: `Title ${paperId}`,
  summary: `Summary ${paperId}`,
  authors: [],
  publishedTimestamp: '',
  updatedTimestamp: '',
  version: 'v1',
});

describe('lumi_paper_utils', () => {
  describe('sortPaperDataByTimestamp', () => {
    it('should sort papers in descending order of addedTimestamp', () => {
      const papers: PaperData[] = [
        {
          metadata: createMockMetadata('1'),
          history: [],
          status: 'complete',
          addedTimestamp: 100,
        },
        {
          metadata: createMockMetadata('2'),
          history: [],
          status: 'complete',
          addedTimestamp: 300,
        },
        {
          metadata: createMockMetadata('3'),
          history: [],
          status: 'complete',
          addedTimestamp: 200,
        },
      ];

      const sortedPapers = sortPaperDataByTimestamp(papers);

      expect(sortedPapers[0].metadata.paperId).to.equal('2');
      expect(sortedPapers[1].metadata.paperId).to.equal('3');
      expect(sortedPapers[2].metadata.paperId).to.equal('1');
    });

    it('should handle items with null or undefined timestamps, placing them last', () => {
      const papers: PaperData[] = [
        {
          metadata: createMockMetadata('1'),
          history: [],
          status: 'complete',
          addedTimestamp: 100,
        },
        {
          metadata: createMockMetadata('2'),
          history: [],
          status: 'complete',
          addedTimestamp: undefined,
        },
        {
          metadata: createMockMetadata('3'),
          history: [],
          status: 'complete',
          addedTimestamp: 200,
        },
        {
          metadata: createMockMetadata('4'),
          history: [],
          status: 'complete',
          addedTimestamp: undefined,
        },
      ];

      const sortedPapers = sortPaperDataByTimestamp(papers);

      expect(sortedPapers[0].metadata.paperId).to.equal('3');
      expect(sortedPapers[1].metadata.paperId).to.equal('1');
      // The order between '2' and '4' is not guaranteed, but they should be last.
      const lastTwoIds = [
        sortedPapers[2].metadata.paperId,
        sortedPapers[3].metadata.paperId,
      ];
      expect(lastTwoIds).to.contain('2');
      expect(lastTwoIds).to.contain('4');
    });

    it('should return an empty array if given an empty array', () => {
      const papers: PaperData[] = [];
      const sortedPapers = sortPaperDataByTimestamp(papers);
      expect(sortedPapers).to.deep.equal([]);
    });

    it('should not mutate the original array', () => {
      const papers: PaperData[] = [
        {
          metadata: createMockMetadata('1'),
          history: [],
          status: 'complete',
          addedTimestamp: 100,
        },
        {
          metadata: createMockMetadata('2'),
          history: [],
          status: 'complete',
          addedTimestamp: 300,
        },
      ];
      const originalOrder = [...papers];

      sortPaperDataByTimestamp(papers);

      expect(papers).to.deep.equal(originalOrder);
    });
  });
});
