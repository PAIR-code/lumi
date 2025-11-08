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
import { HistoryCollapseManager } from './history_collapse_manager';

describe('HistoryCollapseManager', () => {
  let collapseManager: HistoryCollapseManager;

  beforeEach(() => {
    collapseManager = new HistoryCollapseManager();
  });

  it('should be created', () => {
    expect(collapseManager).to.exist;
  });

  describe('Answer Collapse State Management', () => {
    it('should return false (expanded) for an unknown answer by default', () => {
      expect(collapseManager.isAnswerCollapsed('unknown-id')).to.be.false;
    });

    it('should set the collapsed state of an answer', () => {
      const answerId = 'answer-1';
      collapseManager.setAnswerCollapsed(answerId, true);
      expect(collapseManager.isAnswerCollapsed(answerId)).to.be.true;
      collapseManager.setAnswerCollapsed(answerId, false);
      expect(collapseManager.isAnswerCollapsed(answerId)).to.be.false;
    });

    it('should toggle the collapsed state of an answer', () => {
      const answerId = 'answer-1';
      expect(collapseManager.isAnswerCollapsed(answerId)).to.be.false;
      collapseManager.toggleAnswerCollapsed(answerId);
      expect(collapseManager.isAnswerCollapsed(answerId)).to.be.true;
      collapseManager.toggleAnswerCollapsed(answerId);
      expect(collapseManager.isAnswerCollapsed(answerId)).to.be.false;
    });

    it('should collapse all answers except the specified one', () => {
      const answer1 = 'answer-1';
      const answer2 = 'answer-2';
      const answer3 = 'answer-3';

      // Set some initial states
      collapseManager.setAnswerCollapsed(answer1, false);
      collapseManager.setAnswerCollapsed(answer2, false);
      collapseManager.setAnswerCollapsed(answer3, true);

      collapseManager.collapseAllAnswersExcept(answer2);

      expect(collapseManager.isAnswerCollapsed(answer1)).to.be.true;
      expect(collapseManager.isAnswerCollapsed(answer2)).to.be.false;
      expect(collapseManager.isAnswerCollapsed(answer3)).to.be.true; // Should remain collapsed
    });
  });
});
