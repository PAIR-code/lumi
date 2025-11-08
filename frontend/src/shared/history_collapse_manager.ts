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

import { action, makeObservable, observable } from 'mobx';
import { LumiAnswer } from './api';

const INITIAL_ANSWERS_COLLAPSE_STATE = true;
const FIRST_ANSWER_COLLAPSE_STATE = false;

/**
 * Manages the collapse/expand state of answers in the history panel.
 */
export class HistoryCollapseManager {
  answerCollapseState = new Map<string, boolean>();

  constructor() {
    makeObservable(this, {
      answerCollapseState: observable.shallow,
      setAnswerCollapsed: action,
      toggleAnswerCollapsed: action,
      collapseAllAnswersExcept: action,
    });
  }

  initialize(answers: LumiAnswer[]) {
    answers.forEach((answer, index) => {
      let collapseState = INITIAL_ANSWERS_COLLAPSE_STATE;
      if (index === 0) {
        collapseState = FIRST_ANSWER_COLLAPSE_STATE;
      }
      this.answerCollapseState.set(answer.id, collapseState);
    });
  }

  isAnswerCollapsed(answerId: string): boolean {
    return this.answerCollapseState.get(answerId) ?? false;
  }

  setAnswerCollapsed(answerId: string, value: boolean) {
    this.answerCollapseState.set(answerId, value);
  }

  toggleAnswerCollapsed(answerId: string) {
    const currentState = this.isAnswerCollapsed(answerId);
    this.answerCollapseState.set(answerId, !currentState);
  }

  collapseAllAnswersExcept(answerIdToKeepExpanded: string) {
    for (const answerId of this.answerCollapseState.keys()) {
      if (answerId !== answerIdToKeepExpanded) {
        this.answerCollapseState.set(answerId, true);
      }
    }
    this.answerCollapseState.set(answerIdToKeepExpanded, false);
  }
}
