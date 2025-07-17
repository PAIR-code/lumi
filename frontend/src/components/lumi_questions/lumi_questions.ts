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
import { HistoryService } from "../../services/history.service";
import { LumiAnswer } from "../../shared/api";

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
import { ifDefined } from "lit/directives/if-defined.js";

/**
 * A component for asking questions to Lumi and viewing the history.
 */
@customElement("lumi-questions")
export class LumiQuestions extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly historyService = core.getService(HistoryService);

  @property({ type: Boolean }) isHistoryShowAll = false;
  @property({ type: Object }) setHistoryVisible?: (isVisible: boolean) => void;
  @property() onTextSelection: (selectionInfo: SelectionInfo) => void =
    () => {};
  @state() private dismissedAnswers = new Set<string>();

  override connectedCallback(): void {
    super.connectedCallback();
    const docId = this.getDocId();
    if (!docId) return;

    const answers = this.historyService.getAnswers(docId);
    answers.forEach((answer) => {
      this.dismissedAnswers.add(answer.id);
    });
  }

  private onReferenceClick(highlightedSpans: HighlightSelection[]) {
    this.documentStateService.focusOnSpan(highlightedSpans);
  }

  private onDismiss(answerId: string) {
    this.dismissedAnswers.add(answerId);
    this.requestUpdate();
  }

  private getAnswersToRender(docId: string): {
    answers: LumiAnswer[];
    canDismiss: boolean;
  } {
    const answers = this.historyService.getAnswers(docId);
    const tempAnswers = this.historyService.getTemporaryAnswers();
    const personalSummary = docId
      ? this.historyService.personalSummaries.get(docId)
      : undefined;

    let allAnswers = [...tempAnswers, ...answers];

    const latestAnswer = allAnswers.length > 0 ? allAnswers[0] : null;
    const isLatestAnswerDismissed = latestAnswer
      ? this.dismissedAnswers.has(latestAnswer.id)
      : false;

    if (personalSummary) {
      allAnswers.push(personalSummary);
    }

    if (this.isHistoryShowAll)
      return { answers: allAnswers, canDismiss: false };
    if (!isLatestAnswerDismissed && latestAnswer)
      return { answers: [latestAnswer], canDismiss: true };
    if (personalSummary)
      return { answers: [personalSummary], canDismiss: false };
    return { answers: [], canDismiss: false };
  }

  private getDocId() {
    return this.documentStateService.lumiDocManager?.lumiDoc.metadata?.paperId;
  }

  private renderHistory() {
    const docId = this.getDocId();
    if (!docId) return nothing;

    const { answers: answersToRender, canDismiss } =
      this.getAnswersToRender(docId);
    const isSummaryLoading = this.historyService.isPersonalSummaryLoading;
    if (answersToRender.length === 0 && !isSummaryLoading) {
      return nothing;
    }

    if (isSummaryLoading) {
      return html`<div class="loading-indicator">
        Loading personal summary...
      </div>`;
    }

    const showSeeAllButton =
      !this.isHistoryShowAll &&
      this.historyService.getAnswers(docId).length > 1;

    const historyContainerClasses = classMap({
      "history-container": true,
      "is-history-show-all": this.isHistoryShowAll,
      "show-see-all-button": showSeeAllButton,
    });
    return html`
      <div class=${historyContainerClasses}>
        ${answersToRender.map((answer: LumiAnswer) => {
          const onDismiss = canDismiss ? this.onDismiss.bind(this) : undefined;

          return html`
            <answer-item
              .onTextSelection=${this.onTextSelection}
              .onReferenceClick=${this.onReferenceClick.bind(this)}
              .onDismiss=${ifDefined(onDismiss)}
              .answer=${answer}
              .isLoading=${answer.isLoading || false}
              .lumiDocManager=${this.documentStateService.lumiDocManager}
              .highlightManager=${this.documentStateService.highlightManager}
            ></answer-item>
          `;
        })}
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
