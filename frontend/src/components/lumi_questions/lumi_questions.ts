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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { FirebaseService } from "../../services/firebase.service";
import { HistoryService } from "../../services/history.service";
import { RouterService } from "../../services/router.service";
import { LumiAnswer, LumiAnswerRequest } from "../../shared/api";
import { getLumiResponseCallable } from "../../shared/callables";
import { createTemporaryAnswer } from "../../shared/answer_utils";

import "./answer_item";
import "../lumi_span/lumi_span";
import "../../pair-components/icon_button";
import "../../pair-components/textinput";
import "../../pair-components/icon";

import { styles } from "./lumi_questions.scss";
import { DocumentStateService } from "../../services/document_state.service";
import {
  HighlightSelection,
  SelectionInfo,
} from "../../shared/selection_utils";

/**
 * A component for asking questions to Lumi and viewing the history.
 */
@customElement("lumi-questions")
export class LumiQuestions extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly historyService = core.getService(HistoryService);
  private readonly routerService = core.getService(RouterService);

  @property({ type: Boolean }) isHistoryShowAll = false;
  @property({ type: Object }) setHistoryVisible?: (isVisible: boolean) => void;
  @property() onTextSelection: (selectionInfo: SelectionInfo) => void =
    () => {};

  @state() private query = "";

  private async handleSearch() {
    const lumiDoc = this.documentStateService.lumiDocManager?.lumiDoc;

    if (!this.query || !lumiDoc || this.historyService.isAnswerLoading) {
      return;
    }

    const docId = this.routerService.getActiveRouteParams()["document_id"];

    const request: LumiAnswerRequest = {
      query: this.query,
      // TODO(ellenj): Update question-answering to make use of history.
      history: [],
    };

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);
    const queryToClear = this.query;

    try {
      const response = await getLumiResponseCallable(
        this.firebaseService.functions,
        lumiDoc,
        request
      );
      this.historyService.addAnswer(docId, response);
      this.query = "";
    } catch (e) {
      console.error("Error getting Lumi response:", e);
      // TODO(ellenj): Show error to user with a toast.
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
      if (this.query === queryToClear) {
        this.query = "";
      }
    }
  }

  private onReferenceClick(highlightedSpans: HighlightSelection[]) {
    this.documentStateService.focusOnSpan(highlightedSpans);
  }

  private renderHistory() {
    const docId =
      this.documentStateService.lumiDocManager?.lumiDoc.metadata?.paperId;
    if (!docId) return nothing;

    const answers = this.historyService.getAnswers(docId);
    const tempAnswers = this.historyService.getTemporaryAnswers(docId);
    const personalSummary = docId
      ? this.historyService.personalSummaries.get(docId)
      : undefined;
    const isSummaryLoading = this.historyService.isPersonalSummaryLoading;

    let allAnswers = [...tempAnswers, ...answers];
    if (personalSummary) {
      allAnswers.push(personalSummary);
    }

    if (allAnswers.length === 0 && !isSummaryLoading) {
      return nothing;
    }

    if (isSummaryLoading) {
      return html`<div class="loading-indicator">
        Loading personal summary...
      </div>`;
    }

    const answersToRender = this.isHistoryShowAll
      ? allAnswers
      : allAnswers.slice(0, 1);

    const showSeeAllButton = !this.isHistoryShowAll && allAnswers.length > 1;

    return html`
      <div class="history-container">
        ${answersToRender.map(
          (answer: LumiAnswer) => html`
            <answer-item
              .onTextSelection=${this.onTextSelection}
              .onReferenceClick=${this.onReferenceClick.bind(this)}
              .answer=${answer}
              .isLoading=${answer.isLoading || false}
              .lumiDocManager=${this.documentStateService.lumiDocManager}
              .highlightManager=${this.documentStateService.highlightManager}
            ></answer-item>
          `
        )}
      </div>
      ${showSeeAllButton
        ? html`
            <div class="history-controls">
              <pr-button
                class="history-button"
                variant="default"
                @click=${() => this.setHistoryVisible?.(true)}
                >See all</pr-button
              >
            </div>
          `
        : nothing}
    `;
  }

  private renderBackButton() {
    if (!this.isHistoryShowAll) {
      return nothing;
    }

    return html`
      <div class="back-button-container">
        <pr-icon-button
          @click=${() => this.setHistoryVisible?.(false)}
          .icon=${"arrow_back"}
          variant="default"
        ></pr-icon-button>
        <span>All responses</span>
      </div>
    `;
  }

  override render() {
    // TODO(ellenj): Fix loading state in pr-icon-button.
    const isLoading = this.historyService.isAnswerLoading;

    if (this.isHistoryShowAll) {
      return html` ${this.renderBackButton()} ${this.renderHistory()} `;
    }

    return html`
      <div class="input-container">
        <pr-textinput
          .value=${this.query}
          .onChange=${(e: InputEvent) =>
            (this.query = (e.target as HTMLInputElement).value)}
          .onKeydown=${(e: KeyboardEvent) => {
            if (e.key === "Enter") this.handleSearch();
          }}
          placeholder="Ask Lumi"
          class="search-input"
          ?disabled=${isLoading}
        ></pr-textinput>
        <pr-icon-button
          icon="search"
          ?disabled=${!this.query || isLoading}
          .loading=${isLoading}
          @click=${this.handleSearch}
        ></pr-icon-button>
      </div>
      ${this.renderHistory()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-questions": LumiQuestions;
  }
}
