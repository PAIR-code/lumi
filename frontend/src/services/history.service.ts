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

import { action, computed, makeObservable, observable } from 'mobx';
import { Service } from './service';
import { LumiAnswer } from '../shared/api';
import { PaperData } from '../shared/types_local_storage';
import { LocalStorageService } from './local_storage.service';
import { ArxivMetadata } from '../shared/lumi_doc';
import { sortPaperDataByTimestamp } from '../shared/lumi_paper_utils';
import { PERSONAL_SUMMARY_QUERY_NAME } from '../shared/constants';
import { AnswerHighlightManager } from '../shared/answer_highlight_manager';
import { HistoryCollapseManager } from '../shared/history_collapse_manager';
import { ScrollState } from '../contexts/scroll_context';
import { getAllSpansFromContents } from '../shared/lumi_doc_utils';

const PAPER_KEY_PREFIX = 'lumi-paper:';
const INITIAL_SUMMARY_COLLAPSE_STATE = true;

interface ServiceProvider {
  localStorageService: LocalStorageService;
}

/**
 * A service to manage the history of Lumi questions and answers.
 * History is stored per document ID in local storage.
 */
export class HistoryService extends Service {
  answers = new Map<string, LumiAnswer[]>();
  temporaryAnswers: LumiAnswer[] = [];
  paperMetadata = new Map<string, ArxivMetadata>();
  personalSummaries = new Map<string, LumiAnswer>();
  readonly answerHighlightManager: AnswerHighlightManager;
  readonly historyCollapseManager: HistoryCollapseManager;

  private scrollState?: ScrollState;
  private readonly spanIdToAnswerIdMap = new Map<string, string>();

  constructor(private readonly sp: ServiceProvider) {
    super();
    this.answerHighlightManager = new AnswerHighlightManager();
    this.historyCollapseManager = new HistoryCollapseManager();
    makeObservable(this, {
      answers: observable.shallow,
      temporaryAnswers: observable.shallow,
      paperMetadata: observable.shallow,
      personalSummaries: observable.shallow,
      isAnswerLoading: computed,
      addAnswer: action,
      addTemporaryAnswer: action,
      removeTemporaryAnswer: action,
      clearTemporaryAnswers: action,
      addPaper: action,
      addPersonalSummary: action,
      addLoadingPaper: action,
      deletePaper: action,
      clearAllHistory: action,
      getPaperHistory: observable,
    });
  }

  setScrollState(scrollState: ScrollState) {
    this.scrollState = scrollState;
  }

  get isAnswerLoading() {
    return this.temporaryAnswers.length > 0;
  }

  get isNonSummaryAnswerLoading() {
    if (this.temporaryAnswers.length === 0) return false;
    for (const answer of this.temporaryAnswers) {
      if (answer.request.query === PERSONAL_SUMMARY_QUERY_NAME) {
        return false;
      }
    }
    return true;
  }

  override initialize(): void {
    // Load all paper data from local storage on initialization
    const paperKeys = this.sp.localStorageService.listKeys(PAPER_KEY_PREFIX);
    const allAnswers: LumiAnswer[] = [];
    for (const key of paperKeys) {
      const paperData = this.sp.localStorageService.getData<PaperData | null>(
        key,
        null
      );
      if (paperData) {
        const paperId = paperData.metadata.paperId;
        this.paperMetadata.set(paperId, paperData.metadata);
        this.answers.set(paperId, paperData.history);
        allAnswers.push(...paperData.history);
        if (paperData.personalSummary) {
          this.personalSummaries.set(paperId, paperData.personalSummary);
          this.historyCollapseManager.setAnswerCollapsed(
            paperData.personalSummary.id,
            INITIAL_SUMMARY_COLLAPSE_STATE
          );
        }
      }
    }
    this.answerHighlightManager.populateFromAnswers(allAnswers);
    this.historyCollapseManager.initialize(allAnswers);

    for (const answer of allAnswers) {
      this.updateAnswerSpansMap(answer);
    }
  }

  /**
   * Retrieves the answer history for a given document ID.
   * @param docId The ID of the document.
   * @returns An array of LumiAnswer objects, or an empty array if none exist.
   */
  getAnswers(docId: string): LumiAnswer[] {
    return this.answers.get(docId) || [];
  }

  getPaperData(docId: string): PaperData | null {
    const key = `${PAPER_KEY_PREFIX}${docId}`;
    return this.sp.localStorageService.getData<PaperData | null>(key, null);
  }

  /**
   * Retrieves all paper data from local storage.
   * @returns An array of PaperData objects.
   */
  getPaperHistory(sortByTimestamp = true): PaperData[] {
    const paperKeys = this.sp.localStorageService.listKeys(PAPER_KEY_PREFIX);
    const papers: PaperData[] = [];
    for (const key of paperKeys) {
      const paperData = this.sp.localStorageService.getData<PaperData | null>(
        key,
        null
      );
      if (paperData) {
        papers.push(paperData);
      }
    }
    if (sortByTimestamp) {
      return sortPaperDataByTimestamp(papers);
    }
    return papers;
  }

  private updateAnswerSpansMap(answer: LumiAnswer) {
    const spans = getAllSpansFromContents(answer.responseContent);
    for (const span of spans) {
      this.spanIdToAnswerIdMap.set(span.id, answer.id);
    }
  }

  /**
   * Adds a new answer to the history for a given document ID.
   * Answers are prepended to the array to keep the most recent first.
   * @param docId The ID of the document.
   * @param answer The LumiAnswer object to add.
   */
  addAnswer(docId: string, answer: LumiAnswer) {
    const currentAnswers = this.getAnswers(docId);
    this.answers.set(docId, [answer, ...currentAnswers]);
    this.answerHighlightManager.addAnswer(answer);
    this.historyCollapseManager.setAnswerCollapsed(answer.id, false);

    this.updateAnswerSpansMap(answer);
    this.syncPaperToLocalStorage(docId);
  }

  /**
   * Adds a new temporary answer for a given document ID.
   * @param docId The ID of the document.
   * @param answer The temporary LumiAnswer object to add.
   * @param collapseOthers Whether to collapse other answers.
   */
  addTemporaryAnswer(answer: LumiAnswer, collapseOthers = true) {
    this.temporaryAnswers.push(answer);

    if (collapseOthers) {
      this.historyCollapseManager.collapseAllAnswersExcept(answer.id);
      this.scrollState?.scrollAnswersToTop();
    }
  }

  /**
   * Removes a temporary answer for a given document ID.
   * @param docId The ID of the document.
   * @param answerId The ID of the temporary LumiAnswer object to remove.
   */
  removeTemporaryAnswer(answerId: string) {
    const answerIndex = this.temporaryAnswers.findIndex(
      (answer) => answer.id === answerId
    );
    if (answerIndex > -1) {
      this.temporaryAnswers.splice(answerIndex, 1);
    }
  }

  /**
   * Retrieves the temporary answer history for a given document ID.
   * @param docId The ID of the document.
   * @returns An array of LumiAnswer objects, or an empty array if none exist.
   */
  getTemporaryAnswers(): LumiAnswer[] {
    return this.temporaryAnswers;
  }

  /**
   * Clears all temporary answers.
   */
  clearTemporaryAnswers() {
    this.temporaryAnswers = [];
  }

  /**
   * Adds a new personal summary for a given document ID.
   * @param docId The ID of the document.
   * @param summary The LumiAnswer object to add.
   */
  addPersonalSummary(docId: string, summary: LumiAnswer) {
    this.personalSummaries.set(docId, summary);
    this.syncPaperToLocalStorage(docId);
  }

  /**
   * Adds a paper with 'loading' status.
   * @param docId The ID of the document.
   * @param metadata The metadata of the paper.
   */
  addLoadingPaper(docId: string, metadata: ArxivMetadata) {
    if (this.paperMetadata.has(docId)) {
      return;
    }
    this.paperMetadata.set(docId, metadata);
    const newPaper: PaperData = {
      metadata,
      history: [],
      status: 'loading',
      addedTimestamp: Date.now(),
    };
    this.sp.localStorageService.setData(
      `${PAPER_KEY_PREFIX}${docId}`,
      newPaper
    );
  }

  /**
   * Adds a paper to the history or updates its status to 'complete'.
   * @param docId The ID of the document.
   * @param metadata The metadata of the paper.
   */
  addPaper(docId: string, metadata: ArxivMetadata) {
    // If the paper already exists (i.e., it was a loading paper),
    // we just update its status. Otherwise, we create a new entry.
    const existingPaper = this.getPaperData(docId);
    if (existingPaper) {
      existingPaper.status = 'complete';
      this.sp.localStorageService.setData(
        `${PAPER_KEY_PREFIX}${docId}`,
        existingPaper
      );
    } else {
      this.paperMetadata.set(docId, metadata);
      const newPaper: PaperData = {
        metadata,
        history: [],
        status: 'complete',
        addedTimestamp: Date.now(),
      };
      this.sp.localStorageService.setData(
        `${PAPER_KEY_PREFIX}${docId}`,
        newPaper
      );
    }
  }

  /**
   * Deletes a paper and its history.
   * @param docId The ID of the document to delete.
   */
  deletePaper(docId: string) {
    this.paperMetadata.delete(docId);
    this.answers.delete(docId);
    this.personalSummaries.delete(docId);
    this.sp.localStorageService.deleteData(`${PAPER_KEY_PREFIX}${docId}`);
  }

  /**
   * Clears all paper history from memory and local storage.
   */
  clearAllHistory() {
    const paperKeys = this.sp.localStorageService.listKeys(PAPER_KEY_PREFIX);
    for (const key of paperKeys) {
      this.sp.localStorageService.deleteData(key);
    }
    this.paperMetadata.clear();
    this.answers.clear();
    this.personalSummaries.clear();
    this.answerHighlightManager.clearHighlights();
    this.spanIdToAnswerIdMap.clear();
  }

  /**
   * Retrieves the Answer ID for a given Span ID.
   * @param spanId The ID of the span.
   * @returns The Answer ID if found, otherwise undefined.
   */
  getAnswerIdForSpan(spanId: string): string | undefined {
    return this.spanIdToAnswerIdMap.get(spanId);
  }

  private syncPaperToLocalStorage(docId: string) {
    const paperData = this.getPaperData(docId);
    if (!paperData) {
      console.warn(`Attempted to sync paper that does not exist: ${docId}`);
      return;
    }

    const updatedPaperData: PaperData = {
      ...paperData,
      history: this.getAnswers(docId),
      personalSummary: this.personalSummaries.get(docId),
    };

    this.sp.localStorageService.setData(
      `${PAPER_KEY_PREFIX}${docId}`,
      updatedPaperData
    );
  }
}
