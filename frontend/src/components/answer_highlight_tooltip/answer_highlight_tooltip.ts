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

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  AnswerHighlightTooltipProps,
  FloatingPanelService,
} from '../../services/floating_panel_service';
import { styles } from './answer_highlight_tooltip.scss';
import { core } from '../../core/core';
import { DocumentStateService } from '../../services/document_state.service';
import { HistoryService } from '../../services/history.service';
import { LumiAnswer } from '../../shared/api';

import { LumiContent } from '../../shared/lumi_doc';
import { classMap } from 'lit/directives/class-map.js';

import '../lumi_content/lumi_content';

/**
 * A tooltip that displays the content of a LumiAnswer.
 */
@customElement('answer-highlight-tooltip')
export class AnswerHighlightTooltip extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) props!: AnswerHighlightTooltipProps;
  @state() private showAll = false;

  private documentStateService = core.getService(DocumentStateService);
  private historyService = core.getService(HistoryService);
  private floatingPanelService = core.getService(FloatingPanelService);

  private readonly handleAnswerHighlightClick = (
    answer: LumiAnswer,
    target: HTMLElement
  ) => {
    const props = new AnswerHighlightTooltipProps(answer);
    this.floatingPanelService.show(props, target);
  };

  private showContent() {
    this.showAll = true;
  }

  private renderQuery() {
    const query = this.props.answer.request.query;
    if (!query) return nothing;

    return html`<div class="query">"${query}"</div>`;
  }

  override render(): TemplateResult {
    const allContent = this.props.answer.responseContent;
    if (!allContent || allContent.length === 0) {
      return html`<div>No content to display.</div>`;
    }

    const contentToShow = this.showAll ? allContent : allContent.slice(0, 1);
    const hasMoreContent = allContent.length > 1;

    const renderItem = (content: LumiContent) =>
      html`<lumi-content
        .content=${content}
        .references=${this.documentStateService.lumiDocManager?.lumiDoc
          .references}
        .summary=${null}
        .spanSummaries=${new Map()}
        .focusedSpanId=${null}
        .highlightManager=${this.documentStateService.highlightManager!}
        .answerHighlightManager=${this.historyService.answerHighlightManager!}
        .collapseManager=${this.documentStateService.collapseManager!}
        .onSpanSummaryMouseEnter=${() => {}}
        .onSpanSummaryMouseLeave=${() => {}}
        .onAnswerHighlightClick=${this.handleAnswerHighlightClick.bind(this)}
        .dense=${true}
      ></lumi-content>`;

    const showButton = hasMoreContent && !this.showAll;

    const answerHighlightClasses = classMap({
      'answer-highlight-tooltip': true,
      'no-show-all-button': !showButton,
    });

    return html`
      <div class=${answerHighlightClasses}>
        ${this.renderQuery()} ${contentToShow.map(renderItem.bind(this))}
        ${showButton
          ? html`<pr-icon-button
              title="See more"
              icon="more_horiz"
              variant="default"
              class="show-more-button"
              color="secondary"
              @click=${this.showContent.bind(this)}
            ></pr-icon-button>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'answer-highlight-tooltip': AnswerHighlightTooltip;
  }
}
