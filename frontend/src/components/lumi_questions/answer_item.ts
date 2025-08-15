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

import { html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { consume } from "@lit/context";
import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import { LumiAnswer } from "../../shared/api";
import { LumiContent, LumiSpan } from "../../shared/lumi_doc";
import { getReferencedSpanIdsFromContent } from "../../shared/lumi_doc_utils";
import { LumiDocManager } from "../../shared/lumi_doc_manager";

import "../../pair-components/icon";
import "../../pair-components/icon_button";
import "../../pair-components/circular_progress";
import "../lumi_span/lumi_span";
import { renderContent } from "../lumi_doc/renderers/content_renderer";

import { styles } from "./answer_item.scss";

import { HighlightSelection } from "../../shared/selection_utils";
import { HighlightManager } from "../../shared/highlight_manager";
import { CollapseManager } from "../../shared/collapse_manager";
import { AnswerHighlightManager } from "../../shared/answer_highlight_manager";
import { LightMobxLitElement } from "../light_mobx_lit_element/light_mobx_lit_element";

/**
 * An answer item in the Lumi questions history.
 */
@customElement("answer-item")
export class AnswerItem extends LightMobxLitElement {
  @property({ type: Object }) answer!: LumiAnswer;
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Object }) lumiDocManager?: LumiDocManager;
  @property({ type: Object }) highlightManager?: HighlightManager;
  @property({ type: Object }) answerHighlightManager?: AnswerHighlightManager;
  @property({ type: Object }) collapseManager?: CollapseManager;
  @property() registerShadowRoot: (shadowRoot: ShadowRoot) => void = () => {};
  @property() unregisterShadowRoot: (shadowRoot: ShadowRoot) => void = () => {};
  @property()
  onReferenceClick: (highlightedSpans: HighlightSelection[]) => void = () => {};
  @property()
  onImageReferenceClick: (imageStoragePath: string) => void = () => {};
  @property() onDismiss?: (answerId: string) => void;

  @consume({ context: scrollContext })
  private scrollContext?: ScrollState;

  @state() private areReferencesShown = false;
  @state() private isAnswerCollapsed = false;
  @state() private referencedSpans: LumiSpan[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.shadowRoot) {
      this.registerShadowRoot(this.shadowRoot);
    }
  }

  override disconnectedCallback(): void {
    if (this.shadowRoot) {
      this.unregisterShadowRoot(this.shadowRoot);
    }
    super.disconnectedCallback();
  }

  private toggleReferences() {
    this.areReferencesShown = !this.areReferencesShown;
  }

  private toggleAnswer() {
    this.isAnswerCollapsed = !this.isAnswerCollapsed;
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("answer")) {
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

    if (_changedProperties.has("isLoading")) {
      if (this.isLoading) {
        this.isAnswerCollapsed = false;
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
                  .spanProperties=${{
                    span: copiedSpan,
                    references: this.lumiDocManager?.lumiDoc.references,
                    highlightManager: this.highlightManager,
                    answerHighlightManager: this.answerHighlightManager,
                  }}
                ></lumi-span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderImagePreview() {
    const imageStoragePath = this.answer.request.imageStoragePath;
    if (!imageStoragePath) {
      return nothing;
    }

    return html`
      <div class="highlight" .title="The image this answer is about">
        <span>Image</span>
        <pr-icon-button
          icon="open_in_new"
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
          icon="open_in_new"
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
        return renderContent({
          parentComponent: this,
          content,
          references: this.lumiDocManager?.lumiDoc.references,
          referencedSpans: this.referencedSpans,
          summary: null,
          spanSummaries: new Map(),
          focusedSpanId: null,
          highlightManager: this.highlightManager!,
          answerHighlightManager: this.answerHighlightManager!,
          collapseManager: this.collapseManager!,
          onSpanSummaryMouseEnter: () => {},
          onSpanSummaryMouseLeave: () => {},
          onSpanReferenceClicked: this.onAnswerSpanReferenceClicked.bind(this),
          dense: true,
        });
      })}
    </div>`;
  }

  private renderContent() {
    if (this.isAnswerCollapsed) return nothing;
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
    const { query, highlight, imageStoragePath } = this.answer.request;
    if (query) return query;

    if (imageStoragePath) {
      return "Explain image";
    }

    if (!highlight) return "";

    if (this.isAnswerCollapsed) {
      return `Explain "${highlight}"`;
    }

    return "Explain text";
  }

  override render() {
    const classes = {
      "history-item": true,
    };

    const questionAnswerContainerStyles = {
      "question-answer-container": true,
      "are-references-shown": this.areReferencesShown,
    };

    const historyItemClasses = {
      "history-item": true,
      "is-collapsed": this.isAnswerCollapsed,
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
                icon=${this.isAnswerCollapsed ? "chevron_right" : "expand_more"}
                variant="default"
                @click=${this.toggleAnswer}
                ?disabled=${this.isLoading}
              ></pr-icon-button>
              <span class="question-text" title=${this.answer.request.query}
                >${this.getTitleText()}</span
              >
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
                    ? "keyboard_arrow_up"
                    : "keyboard_arrow_down"}
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
    "answer-item": AnswerItem;
  }
}
