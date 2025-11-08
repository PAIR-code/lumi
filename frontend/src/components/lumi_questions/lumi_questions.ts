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

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { core } from '../../core/core';
import { HistoryService } from '../../services/history.service';
import { LumiAnswer, LumiAnswerRequest } from '../../shared/api';

import './answer_item';
import '../lumi_span/lumi_span';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/icon';

import { styles } from './lumi_questions.scss';
import { DocumentStateService } from '../../services/document_state.service';
import {
  HighlightSelection,
  SelectionInfo,
} from '../../shared/selection_utils';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';
import {
  AnswerHighlightTooltipProps,
  FloatingPanelService,
  InfoTooltipProps,
} from '../../services/floating_panel_service';
import { DialogService } from '../../services/dialog.service';
import { isViewportSmall } from '../../shared/responsive_utils';
import {
  INPUT_DEBOUNCE_MS,
  MAX_QUERY_INPUT_LENGTH,
} from '../../shared/constants';
import { getLumiResponseCallable } from '../../shared/callables';
import { createTemporaryAnswer } from '../../shared/answer_utils';
import { RouterService } from '../../services/router.service';
import { SnackbarService } from '../../services/snackbar.service';
import { FirebaseService } from '../../services/firebase.service';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { SIDEBAR_PERSONAL_SUMMARY_TOOLTIP_TEXT } from '../../shared/constants_helper_text';
import { SettingsService } from '../../services/settings.service';
import { debounce } from '../../shared/utils';

/**
 * A component for asking questions to Lumi and viewing the history.
 */
@customElement('lumi-questions')
export class LumiQuestions extends LightMobxLitElement {
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly dialogService = core.getService(DialogService);
  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly historyService = core.getService(HistoryService);
  private readonly routerService = core.getService(RouterService);
  private readonly snackbarService = core.getService(SnackbarService);
  private readonly settingsService = core.getService(SettingsService);

  @property() onTextSelection: (selectionInfo: SelectionInfo) => void =
    () => {};
  @state() private dismissedAnswers = new Set<string>();
  @state() private query = '';

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
    this.analyticsService.trackAction(
      AnalyticsAction.QUESTIONS_REFERENCE_CLICK
    );
    this.documentStateService.focusOnSpan(highlightedSpans);
  }

  private onImageReferenceClick(imageStoragePath: string) {
    this.analyticsService.trackAction(
      AnalyticsAction.QUESTIONS_IMAGE_REFERENCE_CLICK
    );
    this.documentStateService.focusOnImage(imageStoragePath);
  }

  private getAnswersToRender(docId: string): LumiAnswer[] {
    const answers = this.historyService.getAnswers(docId);
    const tempAnswers = this.historyService.getTemporaryAnswers();

    return [...tempAnswers, ...answers];
  }

  private getDocId() {
    return this.documentStateService.lumiDocManager?.lumiDoc.metadata?.paperId;
  }

  private async handleSearch() {
    const lumiDoc = this.documentStateService.lumiDocManager?.lumiDoc;

    if (!this.query || !lumiDoc || this.historyService.isAnswerLoading) {
      return;
    }
    this.analyticsService.trackAction(AnalyticsAction.HEADER_EXECUTE_SEARCH);

    const docId = this.routerService.getActiveRouteParams()['document_id'];

    const request: LumiAnswerRequest = {
      query: this.query,
    };

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);
    const queryToClear = this.query;

    try {
      const response = await getLumiResponseCallable(
        this.firebaseService.functions,
        lumiDoc,
        request,
        this.settingsService.apiKey.value
      );
      this.historyService.addAnswer(docId, response);
      this.query = '';
    } catch (e) {
      console.error('Error getting Lumi response:', e);
      this.snackbarService.show('Error: Could not get response from Lumi.');
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
      if (this.query === queryToClear) {
        this.query = '';
      }
    }
  }

  private debouncedUpdate = debounce((value: string) => {
    this.query = value;
  }, INPUT_DEBOUNCE_MS);

  private renderSearch() {
    const isLoading = this.historyService.isAnswerLoading;

    const textareaSize = isViewportSmall() ? 'medium' : 'small';
    return html`
      <div class="input-container">
        <pr-textarea
          .value=${this.query}
          size=${textareaSize}
          .maxLength=${MAX_QUERY_INPUT_LENGTH}
          @change=${(e: CustomEvent) => {
            this.debouncedUpdate(e.detail.value);
          }}
          @keydown=${(e: CustomEvent) => {
            if (e.detail.key === 'Enter') {
              this.handleSearch();
            }
          }}
          placeholder="Ask Lumi..."
          class="search-input"
          ?disabled=${isLoading}
        ></pr-textarea>
        <pr-icon-button
          title="Ask Lumi"
          color="tertiary"
          icon="send"
          ?disabled=${!this.query || isLoading}
          @click=${this.handleSearch}
          variant="default"
        ></pr-icon-button>
      </div>
    `;
  }

  private readonly handleInfoTooltipClick = (
    text: string,
    element: HTMLElement
  ) => {
    this.floatingPanelService.show(
      new InfoTooltipProps((text = text)),
      element
    );
  };

  private readonly handleAnswerHighlightClick = (
    answer: LumiAnswer,
    target: HTMLElement
  ) => {
    const props = new AnswerHighlightTooltipProps(answer);
    this.floatingPanelService.show(props, target);
  };

  private renderAnswer(answer: LumiAnswer, infoTooltipText?: string) {
    return html`
      <answer-item
        .onReferenceClick=${this.onReferenceClick.bind(this)}
        .onImageReferenceClick=${this.onImageReferenceClick.bind(this)}
        .answer=${answer}
        .isLoading=${answer.isLoading || false}
        .lumiDocManager=${this.documentStateService.lumiDocManager}
        .highlightManager=${this.documentStateService.highlightManager}
        .answerHighlightManager=${this.historyService.answerHighlightManager}
        .onAnswerHighlightClick=${this.handleAnswerHighlightClick.bind(this)}
        .onInfoTooltipClick=${this.handleInfoTooltipClick.bind(this)}
        .infoTooltipText=${ifDefined(infoTooltipText)}
        .collapseManager=${this.documentStateService.collapseManager}
        .historyCollapseManager=${this.historyService.historyCollapseManager}
      ></answer-item>
    `;
  }

  private renderHistory() {
    const docId = this.getDocId();
    if (!docId) return nothing;

    const answersToRender = this.getAnswersToRender(docId);

    const personalSummary = docId
      ? this.historyService.personalSummaries.get(docId)
      : undefined;

    if (answersToRender.length === 0 && !personalSummary) {
      return nothing;
    }

    const historyContainerClasses = classMap({
      'history-container': true,
    });
    return html`
      <div class=${historyContainerClasses}>
        ${answersToRender.map((answer: LumiAnswer) => {
          return this.renderAnswer(answer);
        })}
        ${personalSummary
          ? this.renderAnswer(
              personalSummary,
              SIDEBAR_PERSONAL_SUMMARY_TOOLTIP_TEXT
            )
          : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="lumi-questions-host">
        ${this.renderSearch()} ${this.renderHistory()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-questions': LumiQuestions;
  }
}
