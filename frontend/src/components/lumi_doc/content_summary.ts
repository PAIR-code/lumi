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
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { LumiContent, LumiSummary } from '../../shared/lumi_doc';
import { FocusState } from '../../shared/types';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { HighlightManager } from '../../shared/highlight_manager';
import { LumiAnswer } from '../../shared/api';
import { LumiFont } from '../../shared/types';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { styles } from './content_summary.scss';

import '../lumi_span/lumi_span';
import '../../pair-components/icon';
import { getSpanHighlightsFromManagers } from '../lumi_span/lumi_span_utils';

@customElement('lumi-content-summary')
export class LumiContentSummary extends LightMobxLitElement {
  @property({ type: Object }) content!: LumiContent;
  @property({ type: Object }) summary!: LumiSummary | null;
  @property({ type: Object }) spanSummaries: Map<string, LumiSummary> =
    new Map();
  @property({ type: String }) focusedSpanId: string | null = null;
  @property({ type: Boolean }) isCollapsed = false;
  @property({ type: Object }) onCollapseChange: () => void = () => {};
  @property({ type: Object }) onSpanSummaryMouseEnter: (
    spanIds: string[]
  ) => void = () => {};
  @property({ type: Object }) onSpanSummaryMouseLeave: () => void = () => {};
  @property({ type: Object }) highlightManager?: HighlightManager;
  @property({ type: Object }) answerHighlightManager?: AnswerHighlightManager;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;

  private getFocusState(spanIds: string[]) {
    const isFocused =
      !!this.focusedSpanId && spanIds.includes(this.focusedSpanId);
    const hasFocus = !!this.focusedSpanId;

    const focusState = isFocused
      ? FocusState.FOCUSED
      : hasFocus
        ? FocusState.UNFOCUSED
        : FocusState.DEFAULT;
    return { isFocused, hasFocus, focusState };
  }

  private renderSpanSummaries() {
    // Only render sentence-level summaries if there is more
    // than 1 sentence in the content.
    if (!this.spanSummaries || this.spanSummaries.size <= 1) {
      return nothing;
    }

    // Don't render span summaries for list content
    if (this.content.listContent) {
      return nothing;
    }

    const summariesToSpanIds = new Map<string, string[]>();
    this.spanSummaries.forEach((summary) => {
      const existingIds = summariesToSpanIds.get(summary.summary.text);
      if (existingIds) {
        existingIds.push(summary.id);
      } else {
        summariesToSpanIds.set(summary.summary.text, [summary.id]);
      }
    });

    return html`
      ${Array.from(summariesToSpanIds.entries()).map((summaryEntry) => {
        const [summaryText, spanIds] = summaryEntry;
        // Find the first summary that matches the text to use as a representative
        const summary = Array.from(this.spanSummaries.values()).find(
          (s) => s.summary.text === summaryText
        );
        if (!summary) return nothing;

        const { focusState } = this.getFocusState(spanIds);

        const classesObject: { [key: string]: boolean } = {
          'span-summary': true,
        };

        const handleSummaryMouseEnter = () => {
          this.onSpanSummaryMouseEnter(spanIds);
        };

        const handleSummaryMouseLeave = () => {
          this.onSpanSummaryMouseLeave();
        };

        return html` <div
          @mouseenter=${handleSummaryMouseEnter}
          @mouseleave=${handleSummaryMouseLeave}
          class=${classMap(classesObject)}
        >
          <lumi-span
            .classMap=${{ 'span-summary-text': true }}
            .span=${summary.summary}
            .focusState=${focusState}
            .showFocusUnderline=${true}
            .highlights=${getSpanHighlightsFromManagers(
              summary.summary.id,
              this.highlightManager,
              this.answerHighlightManager
            )}
            .onAnswerHighlightClick=${this.onAnswerHighlightClick}
            .font=${LumiFont.SPAN_SUMMARY_TEXT}
          ></lumi-span>
        </div>`;
      })}
    `;
  }

  private renderSummaries() {
    const summaryClasses = {
      summary: true,
      'has-focused-span': !!this.focusedSpanId,
    };

    return html`
      <div class="summaries-container">
        <div class=${classMap(summaryClasses)}>
          ${this.summary
            ? html`<lumi-span
                .classMap=${{
                  'summary-span': true,
                }}
                .span=${this.summary.summary}
                .highlights=${getSpanHighlightsFromManagers(
                  this.summary.summary.id,
                  this.highlightManager,
                  this.answerHighlightManager
                )}
                .onAnswerHighlightClick=${this.onAnswerHighlightClick}
              ></lumi-span>`
            : nothing}
        </div>
        <div class="span-summaries">${this.renderSpanSummaries()}</div>
      </div>
    `;
  }

  override render() {
    if (this.content.imageContent || !this.summary) {
      return nothing;
    }

    const containerClasses = {
      'content-summary-renderer-container': true,
      collapsed: this.isCollapsed,
    };

    const innerSummaryClasses = {
      'inner-summary': true,
      ['collapsed']: this.isCollapsed,
    };

    const icon = this.isCollapsed ? 'chevron_left' : 'chevron_right';
    const title = this.isCollapsed ? 'Show summary' : 'Hide summary';

    return html`
      <style>
        ${styles}
      </style>
      <div class=${classMap(containerClasses)}>
        <div class=${classMap(innerSummaryClasses)}>
          <div
            class="toggle-container"
            @click=${() => {
              this.onCollapseChange();
            }}
          >
            <pr-icon icon=${icon} title=${title} variant="default"></pr-icon>
          </div>
          ${this.renderSummaries()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-content-summary': LumiContentSummary;
  }
}
