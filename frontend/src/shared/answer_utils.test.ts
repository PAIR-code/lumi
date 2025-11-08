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
import * as sinon from 'sinon';
import { LumiAnswerRequest } from './api';
import { createTemporaryAnswer } from './answer_utils';

describe('createTemporaryAnswer', () => {
  let clock: sinon.SinonFakeTimers;
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    // Mock Date.now() to have a predictable timestamp and ID
    clock = sinon.useFakeTimers({ now: mockTimestamp });
  });

  afterEach(() => {
    clock.restore();
  });

  it('should create a temporary answer with the correct properties', () => {
    const request: LumiAnswerRequest = {
      query: 'What is a neural network?',
    };

    const tempAnswer = createTemporaryAnswer(request);

    expect(tempAnswer.id).to.equal(`temp-${mockTimestamp}`);
    expect(tempAnswer.request).to.deep.equal(request);
    expect(tempAnswer.responseContent).to.deep.equal([]);
    expect(tempAnswer.timestamp).to.equal(mockTimestamp);
    expect(tempAnswer.isLoading).to.be.true;
  });

  it('should include highlight and spans if provided in request', () => {
    const highlight = {
      position: { startIndex: 0, endIndex: 4 },
      spanId: 'p1',
    };
    const request: LumiAnswerRequest = {
      query: 'Tell me more about this.',
      highlight: 'this',
      highlightedSpans: [highlight],
    };

    const tempAnswer = createTemporaryAnswer(request);

    expect(tempAnswer.request.query).to.equal('Tell me more about this.');
    expect(tempAnswer.request.highlight).to.equal('this');
    expect(tempAnswer.request.highlightedSpans).to.deep.equal([highlight]);
    expect(tempAnswer.isLoading).to.be.true;
  });
});
