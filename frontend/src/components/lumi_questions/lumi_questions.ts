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
import "../../pair-components/textarea";
import "../../pair-components/icon";

import { styles } from "./lumi_questions.scss";
import { DocumentStateService } from "../../services/document_state.service";
import {
  HighlightSelection,
  SelectionInfo,
} from "../../shared/selection_utils";
import { classMap } from "lit/directives/class-map.js";

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

  private onReferenceClick(highlightedSpans: HighlightSelection[]) {
    this.documentStateService.focusOnSpan(highlightedSpans);
  }

  private renderHistory() {
    const docId =
      this.documentStateService.lumiDocManager?.lumiDoc.metadata?.paperId;
    if (!docId) return nothing;

    const answers = this.historyService.getAnswers(docId);
    const tempAnswers = this.historyService.getTemporaryAnswers();
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

    const historyContainerClasses = classMap({
      "history-container": true,
      "is-history-show-all": this.isHistoryShowAll,
      "show-see-all-button": showSeeAllButton,
    });
    return html`
      <div class=${historyContainerClasses}>
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

    return html` ${this.renderHistory()} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-questions": LumiQuestions;
  }
}
