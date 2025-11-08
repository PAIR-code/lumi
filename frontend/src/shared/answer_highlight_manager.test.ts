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
import { AnswerHighlightManager } from './answer_highlight_manager';
import { LumiAnswer } from './api';

const MOCK_ANSWER_1: LumiAnswer = {
  id: 'ans-1',
  request: {
    highlightedSpans: [
      { spanId: 'span-1', position: { startIndex: 0, endIndex: 5 } },
      { spanId: 'span-2' },
    ],
  },
  responseContent: [],
  timestamp: 0,
};

const MOCK_ANSWER_2: LumiAnswer = {
  id: 'ans-2',
  request: {
    highlightedSpans: [{ spanId: 'span-1' }],
  },
  responseContent: [],
  timestamp: 0,
};

describe('AnswerHighlightManager', () => {
  let manager: AnswerHighlightManager;

  beforeEach(() => {
    manager = new AnswerHighlightManager();
  });

  it('should be empty on instantiation', () => {
    expect(manager.highlightedSpans.size).to.equal(0);
  });

  it('should add highlights from a single answer', () => {
    manager.addAnswer(MOCK_ANSWER_1);

    expect(manager.highlightedSpans.size).to.equal(2);
    const span1Highlights = manager.getSpanHighlights('span-1');
    expect(span1Highlights).to.have.lengthOf(1);
    expect(span1Highlights[0].color).to.equal('green');
    expect(span1Highlights[0].position).to.deep.equal({
      startIndex: 0,
      endIndex: 5,
    });

    const span2Highlights = manager.getSpanHighlights('span-2');
    expect(span2Highlights).to.have.lengthOf(1);
    expect(span2Highlights[0].color).to.equal('green');
    expect(span2Highlights[0].position).to.be.undefined;
  });

  it('should accumulate highlights for the same span from different answers', () => {
    manager.addAnswer(MOCK_ANSWER_1);
    manager.addAnswer(MOCK_ANSWER_2);

    expect(manager.highlightedSpans.size).to.equal(2);
    const span1Highlights = manager.getSpanHighlights('span-1');
    expect(span1Highlights).to.have.lengthOf(2);
  });

  it('should populate highlights from an array of answers', () => {
    manager.populateFromAnswers([MOCK_ANSWER_1, MOCK_ANSWER_2]);

    expect(manager.highlightedSpans.size).to.equal(2);
    expect(manager.getSpanHighlights('span-1')).to.have.lengthOf(2);
    expect(manager.getSpanHighlights('span-2')).to.have.lengthOf(1);
  });

  it('should clear existing highlights when populating', () => {
    manager.addAnswer(MOCK_ANSWER_1);
    expect(manager.highlightedSpans.size).to.equal(2);

    manager.populateFromAnswers([MOCK_ANSWER_2]);
    expect(manager.highlightedSpans.size).to.equal(1);
    expect(manager.getSpanHighlights('span-1')).to.have.lengthOf(1);
    expect(manager.getSpanHighlights('span-2')).to.be.empty;
  });

  it('should handle answers with no highlighted spans gracefully', () => {
    const answerWithoutHighlights: LumiAnswer = {
      id: 'ans-3',
      request: {},
      responseContent: [],
      timestamp: 0,
    };
    manager.addAnswer(answerWithoutHighlights);
    expect(manager.highlightedSpans.size).to.equal(0);
  });
});
