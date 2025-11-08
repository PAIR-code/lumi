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

import { html, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { LumiAnswer } from '../../shared/api';
import { LumiContent, LumiSpan } from '../../shared/lumi_doc';
import { getReferencedSpanIdsFromContent } from '../../shared/lumi_doc_utils';
import { LumiDocManager } from '../../shared/lumi_doc_manager';

import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/circular_progress';
import '../lumi_span/lumi_span';
import '../lumi_content/lumi_content';

import { styles } from './answer_item.scss';

import { HighlightSelection } from '../../shared/selection_utils';
import { HighlightManager } from '../../shared/highlight_manager';
import { HistoryCollapseManager } from '../../shared/history_collapse_manager';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { getSpanHighlightsFromManagers } from '../lumi_span/lumi_span_utils';
import { CollapseManager } from '../../shared/collapse_manager';

/**
 * An answer item in the Lumi questions history.
 */
@customElement('answer-item')
export class AnswerItem extends LightMobxLitElement {
  @property({ type: Object }) answer!: LumiAnswer;
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Object }) lumiDocManager?: LumiDocManager;
  @property({ type: Object }) highlightManager?: HighlightManager;
  @property({ type: Object }) answerHighlightManager?: AnswerHighlightManager;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;

  @property({ type: Object }) collapseManager?: CollapseManager;
  @property({ type: Object }) historyCollapseManager?: HistoryCollapseManager;

  @property()
  onReferenceClick: (highlightedSpans: HighlightSelection[]) => void = () => {};
  @property()
  onImageReferenceClick: (imageStoragePath: string) => void = () => {};
  @property() onDismiss?: (answerId: string) => void;
  @property()
  onInfoTooltipClick: (text: string, element: HTMLElement) => void = () => {};
  @property() infoTooltipText: string = '';

  @state() private areReferencesShown = false;
  @state() private referencedSpans: LumiSpan[] = [];

  private toggleReferences() {
    this.areReferencesShown = !this.areReferencesShown;
  }

  private toggleAnswer() {
    if (!this.historyCollapseManager) return;
    this.historyCollapseManager.toggleAnswerCollapsed(this.answer.id);
  }

  private isCollapsed() {
    if (!this.historyCollapseManager) return false;
    return this.historyCollapseManager.isAnswerCollapsed(this.answer.id);
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('answer')) {
      if (!this.lumiDocManager) {
        return;
      }
      const referencedIds = getReferencedSpanIdsFromContent(
        this.answer.responseContent
      );
      this.referencedSpans = referencedIds
        .map((id) => this.lumiDocManager!.getSpanById(id))
        .filter((span): span is LumiSpan => span !== undefined);
    }

    if (_changedProperties.has('isLoading')) {
      if (this.isLoading) {
        this.historyCollapseManager?.setAnswerCollapsed(this.answer.id, false);
      }
    }
  }

  private renderReferences() {
    if (!this.areReferencesShown) {
      return nothing;
    }

    if (this.referencedSpans.length === 0) {
      return nothing;
    }

    return html`
      <div class="references-panel">
        <div class="references-content">
          ${this.referencedSpans.map((span, i) => {
            // Make a copy of the span and use a separate unique id.
            const copiedSpan = { ...span, id: `${span.id}-ref` };
            return html`
              <div
                class="reference-item"
                @click=${() => this.onReferenceClick([{ spanId: span.id }])}
              >
                <span class="number">${i + 1}.</span>
                <lumi-span
                  .span=${copiedSpan}
                  .references=${this.lumiDocManager?.lumiDoc.references}
                  .highlights=${getSpanHighlightsFromManagers(
                    copiedSpan.id,
                    this.highlightManager,
                    this.answerHighlightManager
                  )}
                ></lumi-span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderImagePreview() {
    const imageStoragePath = this.answer.request.image?.imageStoragePath;
    if (!imageStoragePath) {
      return nothing;
    }

    return html`
      <div class="highlight" .title="The image this answer is about">
        <span>Image</span>
        <pr-icon-button
          icon="arrow_forward"
          ?disabled=${this.isLoading}
          variant="default"
          @click=${() => {
            this.onImageReferenceClick(imageStoragePath);
          }}
        ></pr-icon-button>
      </div>
    `;
  }

  private renderHighlightedText() {
    const highlightedSpans = this.answer.request.highlightedSpans;
    if (
      !this.answer.request.highlight ||
      !highlightedSpans ||
      highlightedSpans.length === 0
    ) {
      return nothing;
    }

    return html`
      <div class="highlight" .title=${this.answer.request.highlight}>
        <span>"${this.answer.request.highlight}"</span>
        <pr-icon-button
          icon="arrow_forward"
          color="tertiary"
          ?disabled=${this.isLoading}
          variant="default"
          @click=${() => {
            this.onReferenceClick(highlightedSpans);
          }}
        ></pr-icon-button>
      </div>
    `;
  }

  private onAnswerSpanReferenceClicked(referenceId: string) {
    this.onReferenceClick([{ spanId: referenceId }]);
  }

  private renderAnswer() {
    if (this.isLoading) {
      return html`
        <div class="spinner">
          <pr-circular-progress></pr-circular-progress>
        </div>
      `;
    }

    return html`<div class="answer">
      ${this.answer.responseContent.map((content: LumiContent) => {
        return html`<lumi-content
          .content=${content}
          .references=${this.lumiDocManager?.lumiDoc.references}
          .referencedSpans=${this.referencedSpans}
          .summary=${null}
          .spanSummaries=${new Map()}
          .focusedSpanId=${null}
          .highlightManager=${this.highlightManager!}
          .answerHighlightManager=${this.answerHighlightManager!}
          .onAnswerHighlightClick=${this.onAnswerHighlightClick?.bind(this)}
          .collapseManager=${this.collapseManager}
          .onSpanSummaryMouseEnter=${() => {}}
          .onSpanSummaryMouseLeave=${() => {}}
          .onSpanReferenceClicked=${this.onAnswerSpanReferenceClicked.bind(
            this
          )}
          .dense=${true}
        ></lumi-content>`;
      })}
    </div>`;
  }

  private renderContent() {
    if (this.isCollapsed()) return nothing;
    return html`
      ${this.renderHighlightedText()} ${this.renderImagePreview()}
      ${this.renderAnswer()}
    `;
  }

  private renderCancelButton() {
    if (!this.onDismiss) return nothing;

    return html`
      <pr-icon-button
        class="dismiss-button"
        icon="close"
        color="tertiary"
        variant="default"
        title="Close"
        @click=${() => {
          if (this.onDismiss) {
            this.onDismiss(this.answer.id);
          }
        }}
        ?hidden=${this.isLoading}
      ></pr-icon-button>
    `;
  }

  private getTitleText() {
    const { query, highlight, image } = this.answer.request;
    if (query) return query;

    if (image) {
      return 'Explain image';
    }

    if (!highlight) return '';

    if (this.isCollapsed()) {
      return `Explain "${highlight}"`;
    }

    return 'Explain text';
  }

  private renderInfoIcon() {
    if (!this.infoTooltipText) return nothing;

    return html`
      <pr-icon
        class="c-lumi-info-icon"
        icon="info"
        variant="default"
        color="neutral"
        title="Click to view"
        @click=${(e: Event) => {
          if (e.currentTarget instanceof HTMLElement) {
            this.onInfoTooltipClick(this.infoTooltipText, e.currentTarget);
          }
        }}
        ?hidden=${this.isLoading}
      ></pr-icon>
    `;
  }

  override render() {
    const isAnswerCollapsed = this.isCollapsed();

    const classes = {
      'history-item': true,
    };

    const questionAnswerContainerStyles = {
      'question-answer-container': true,
      'are-references-shown': this.areReferencesShown,
    };

    const historyItemClasses = {
      'history-item': true,
      'is-collapsed': isAnswerCollapsed,
    };

    const questionTextClasses = {
      'question-text': true,
      'is-collapsed': isAnswerCollapsed,
    };

    return html`
      <style>
        ${styles}
      </style>
      <div class=${classMap(historyItemClasses)}>
        <div class=${classMap(questionAnswerContainerStyles)}>
          <div class="question">
            <div class="left">
              <pr-icon-button
                class="toggle-answer-button"
                icon=${isAnswerCollapsed ? 'chevron_right' : 'expand_more'}
                color="tertiary"
                variant="default"
                @click=${this.toggleAnswer}
                ?disabled=${this.isLoading}
              ></pr-icon-button>
              <span
                class=${classMap(questionTextClasses)}
                title=${this.answer.request.query}
              >
                ${this.getTitleText()} ${this.renderInfoIcon()}
              </span>
            </div>
            ${this.renderCancelButton()}
          </div>
          ${this.renderContent()}
        </div>
        ${this.referencedSpans.length > 0
          ? html`
              <div
                tabindex="0"
                class="toggle-button"
                @click=${this.toggleReferences}
              >
                <pr-icon
                  .icon=${this.areReferencesShown
                    ? 'keyboard_arrow_up'
                    : 'keyboard_arrow_down'}
                  color="tertiary"
                ></pr-icon>
                <span class="mentions-text"
                  >${this.referencedSpans.length} references</span
                >
              </div>
            `
          : nothing}
        ${this.renderReferences()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'answer-item': AnswerItem;
  }
}
