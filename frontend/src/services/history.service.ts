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

import { action, computed, makeObservable, observable } from "mobx";
import { Service } from "./service";
import { LumiAnswer } from "../shared/api";
import { PaperData } from "../shared/types_local_storage";
import { LocalStorageService } from "./local_storage.service";
import { ArxivMetadata } from "../shared/lumi_doc";

const PAPER_KEY_PREFIX = "lumi-paper:";

interface ServiceProvider {
  localStorageService: LocalStorageService;
}

/**
 * A service to manage the history of Lumi questions and answers.
 * History is stored per document ID in local storage.
 */
export class HistoryService extends Service {
  @observable.shallow answers = new Map<string, LumiAnswer[]>();
  // Used to track answers that are still loading.
  @observable.shallow temporaryAnswers: LumiAnswer[] = [];
  @observable.shallow paperMetadata = new Map<string, ArxivMetadata>();
  @observable.shallow personalSummaries = new Map<string, LumiAnswer>();
  @observable isPersonalSummaryLoading = false;

  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @computed get isAnswerLoading() {
    return this.temporaryAnswers.length > 0;
  }

  override initialize(): void {
    // Load all paper data from local storage on initialization
    const paperKeys = this.sp.localStorageService.listKeys(PAPER_KEY_PREFIX);
    for (const key of paperKeys) {
      const paperData = this.sp.localStorageService.getData<PaperData | null>(
        key,
        null
      );
      if (paperData) {
        const paperId = paperData.metadata.paperId;
        this.paperMetadata.set(paperId, paperData.metadata);
        this.answers.set(paperId, paperData.history);
        if (paperData.personalSummary) {
          this.personalSummaries.set(paperId, paperData.personalSummary);
        }
      }
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
  getPaperHistory(): PaperData[] {
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
    return papers;
  }

  /**
   * Adds a new answer to the history for a given document ID.
   * Answers are prepended to the array to keep the most recent first.
   * @param docId The ID of the document.
   * @param answer The LumiAnswer object to add.
   */
  @action
  addAnswer(docId: string, answer: LumiAnswer) {
    const currentAnswers = this.getAnswers(docId);
    this.answers.set(docId, [answer, ...currentAnswers]);
    this.syncPaperToLocalStorage(docId);
  }

  /**
   * Adds a new temporary answer for a given document ID.
   * @param docId The ID of the document.
   * @param answer The temporary LumiAnswer object to add.
   */
  @action
  addTemporaryAnswer(answer: LumiAnswer) {
    this.temporaryAnswers.push(answer);
  }

  /**
   * Removes a temporary answer for a given document ID.
   * @param docId The ID of the document.
   * @param answerId The ID of the temporary LumiAnswer object to remove.
   */
  @action
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
  getTemporaryAnswers(docId: string): LumiAnswer[] {
    return this.temporaryAnswers;
  }

  /**
   * Clears all temporary answers.
   */
  @action
  clearTemporaryAnswers() {
    this.temporaryAnswers = [];
  }

  /**
   * Adds a new personal summary for a given document ID.
   * @param docId The ID of the document.
   * @param summary The LumiAnswer object to add.
   */
  @action
  addPersonalSummary(docId: string, summary: LumiAnswer) {
    this.personalSummaries.set(docId, summary);
    this.syncPaperToLocalStorage(docId);
  }

  /**
   * Adds a paper with 'loading' status.
   * @param docId The ID of the document.
   * @param metadata The metadata of the paper.
   */
  @action
  addLoadingPaper(docId: string, metadata: ArxivMetadata) {
    if (this.paperMetadata.has(docId)) {
      return;
    }
    this.paperMetadata.set(docId, metadata);
    const newPaper: PaperData = {
      metadata,
      history: [],
      status: "loading",
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
  @action
  addPaper(docId: string, metadata: ArxivMetadata) {
    // If the paper already exists (i.e., it was a loading paper),
    // we just update its status. Otherwise, we create a new entry.
    const existingPaper = this.getPaperData(docId);
    if (existingPaper) {
      existingPaper.status = "complete";
      this.sp.localStorageService.setData(
        `${PAPER_KEY_PREFIX}${docId}`,
        existingPaper
      );
    } else {
      this.paperMetadata.set(docId, metadata);
      const newPaper: PaperData = {
        metadata,
        history: [],
        status: "complete",
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
  @action
  deletePaper(docId: string) {
    this.paperMetadata.delete(docId);
    this.answers.delete(docId);
    this.personalSummaries.delete(docId);
    this.sp.localStorageService.deleteData(`${PAPER_KEY_PREFIX}${docId}`);
  }

  /**
   * Clears all paper history from memory and local storage.
   */
  @action
  clearAllHistory() {
    const paperKeys = this.sp.localStorageService.listKeys(PAPER_KEY_PREFIX);
    for (const key of paperKeys) {
      this.sp.localStorageService.deleteData(key);
    }
    this.paperMetadata.clear();
    this.answers.clear();
    this.personalSummaries.clear();
  }

  /**
   * Sets the loading state for the personal summary.
   * @param isLoading Whether the summary is currently loading.
   */
  @action
  setPersonalSummaryLoading(isLoading: boolean) {
    this.isPersonalSummaryLoading = isLoading;
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
