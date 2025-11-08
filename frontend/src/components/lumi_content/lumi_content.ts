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

import { html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  ListContent,
  LumiContent,
  LumiFootnote,
  LumiReference,
  LumiSpan,
  LumiSummary,
  TextContent,
} from '../../shared/lumi_doc';
import { FocusState, LumiFont } from '../../shared/types';
import '../lumi_span/lumi_span';

import '../lumi_content/lumi_image_content';
import '../lumi_content/lumi_html_figure_content';
import '../lumi_doc/content_summary';
import { HighlightManager } from '../../shared/highlight_manager';
import { CollapseManager } from '../../shared/collapse_manager';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { LumiAnswer } from '../../shared/api';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { styles } from './lumi_content.scss';
import { getSpanHighlightsFromManagers } from '../lumi_span/lumi_span_utils';

/**
 * A custom event dispatched when a lumi-content element is first rendered.
 */
export class LumiContentRenderedEvent extends Event {
  static readonly eventName = 'lumi-content-rendered';
  readonly element: LumiContentViz;

  constructor(element: LumiContentViz) {
    super(LumiContentRenderedEvent.eventName, {
      bubbles: true,
      composed: true,
    });
    this.element = element;
  }
}

@customElement('lumi-content')
export class LumiContentViz extends LightMobxLitElement {
  @property({ type: Object }) content!: LumiContent;
  @property({ type: Array }) references?: LumiReference[];
  @property({ type: Array }) footnotes?: LumiFootnote[];
  @property({ type: Array }) referencedSpans?: LumiSpan[];
  @property({ type: Object }) summary: LumiSummary | null = null;
  @property({ type: Object }) spanSummaries = new Map<string, LumiSummary>();
  @property({ type: String }) focusedSpanId: string | null = null;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property({ type: Object }) onSpanSummaryMouseEnter: (
    spanIds: string[]
  ) => void = () => {};
  @property({ type: Object }) onSpanSummaryMouseLeave: () => void = () => {};
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) answerHighlightManager!: AnswerHighlightManager;
  @property({ type: Object }) collapseManager!: CollapseManager;
  @property({ type: Object }) onSpanReferenceClicked?: (
    referenceId: string
  ) => void;
  @property({ type: Object }) onPaperReferenceClick?: (
    reference: LumiReference,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onFootnoteClick?: (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onImageClick?: (
    info: { storagePath: string; caption?: string },
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) font?: LumiFont;
  @property({ type: Boolean }) dense?: boolean = false;

  @property({ type: Boolean }) virtualize: boolean = false;
  @property({ type: Boolean }) shouldFadeIn: boolean = false;

  @state() private isVisible = false;

  override firstUpdated() {
    if (this.virtualize) {
      this.dispatchEvent(new LumiContentRenderedEvent(this));
    }
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
  }

  setVisible(visible: boolean) {
    this.isVisible = visible;
  }

  private getFocusState(focusedSpanId: string | null, spanIds: string[]) {
    const isFocused = !!focusedSpanId && spanIds.includes(focusedSpanId);
    const hasFocus = !!focusedSpanId;

    const focusState = isFocused
      ? FocusState.FOCUSED
      : hasFocus
        ? FocusState.UNFOCUSED
        : FocusState.DEFAULT;
    return { isFocused, hasFocus, focusState };
  }

  private renderSpans(spans: LumiSpan[], monospace = false): TemplateResult[] {
    const isVirtual = !this.isVisible && this.virtualize;
    return spans.map((span) => {
      const { focusState } = this.getFocusState(this.focusedSpanId, [span.id]);
      return html`<lumi-span
        .span=${span}
        .focusState=${focusState}
        .monospace=${monospace}
        .references=${this.references}
        .footnotes=${this.footnotes}
        .referencedSpans=${this.referencedSpans}
        .highlights=${getSpanHighlightsFromManagers(
          span.id,
          this.highlightManager,
          this.answerHighlightManager
        )}
        .onSpanReferenceClicked=${this.onSpanReferenceClicked}
        .onPaperReferenceClick=${this.onPaperReferenceClick}
        .onFootnoteClick=${this.onFootnoteClick}
        .onAnswerHighlightClick=${this.onAnswerHighlightClick}
        .font=${this.font}
        .isVirtual=${isVirtual}
        .shouldFadeIn=${this.shouldFadeIn}
      ></lumi-span>`;
    });
  }

  private renderListContent(
    listContent: ListContent
  ): TemplateResult | typeof nothing {
    if (!listContent) {
      return nothing;
    }

    const listItemsHtml: TemplateResult[] = listContent.listItems.map(
      (listItem) => {
        const spans = listItem.spans;
        const classesObject: { [key: string]: boolean } = {
          'list-item': true,
        };
        return html`<li class=${classMap(classesObject)}>
          ${this.renderSpans(spans)}
          ${listItem.subListContent
            ? this.renderListContent(listItem.subListContent)
            : nothing}
        </li>`;
      }
    );

    if (listContent.isOrdered) {
      return html`<ol>
        ${listItemsHtml}
      </ol>`;
    } else {
      return html`<ul>
        ${listItemsHtml}
      </ul>`;
    }
  }

  private renderTextContent(
    textContent: TextContent
  ): TemplateResult | typeof nothing {
    const tagName = textContent?.tagName ?? '';
    if (!tagName) {
      return nothing;
    }
    const spans = textContent?.spans ?? [];
    const monospace = tagName === 'code' || tagName === 'pre';

    const spansHtml = this.renderSpans(spans, monospace);
    if (tagName === 'p') {
      return html`<p>${spansHtml}</p>`;
    } else if (tagName === 'code') {
      return html`<code class="code">${spansHtml}</code>`;
    } else if (tagName === 'pre') {
      return html` <pre>${spansHtml}</pre> `;
    } else if (tagName === 'figcaption') {
      return html`<figcaption>${spansHtml}</figcaption>`;
    } else {
      console.error('Unsupported tag name: ', tagName);
      return html`<div>${spansHtml}</div>`;
    }
  }

  private renderMainContent() {
    const { content, getImageUrl, onImageClick } = this;
    if (content.htmlFigureContent) {
      return html`<lumi-html-figure-content
        .content=${content.htmlFigureContent}
      ></lumi-html-figure-content>`;
    }
    if (content.imageContent) {
      return html`<lumi-image-content
        .content=${content.imageContent}
        .getImageUrl=${getImageUrl}
        .onImageClick=${onImageClick}
        .highlightManager=${this.highlightManager}
        .answerHighlightManager=${this.answerHighlightManager}
      ></lumi-image-content>`;
    }
    if (content.figureContent) {
      return html`<lumi-image-content
        .content=${content.figureContent}
        .getImageUrl=${getImageUrl}
        .onImageClick=${onImageClick}
        .highlightManager=${this.highlightManager}
        .answerHighlightManager=${this.answerHighlightManager}
      ></lumi-image-content>`;
    }
    if (content.textContent) {
      return this.renderTextContent(content.textContent);
    }
    if (content.listContent) {
      return this.renderListContent(content.listContent);
    }
    return nothing;
  }

  override render() {
    const onContentClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    const mainContentClassesObject: { [key: string]: boolean } = {
      'main-content': true,
      'pre-container': this.content.textContent?.tagName === 'pre',
      'code-container': this.content.textContent?.tagName === 'code',
      dense: this.dense ?? false,
    };

    const isCollapsed = this.collapseManager.getMobileSummaryCollapseState(
      this.content.id
    );

    const isFigureContent =
      this.content.imageContent != null ||
      this.content.figureContent != null ||
      this.content.htmlFigureContent != null;

    const contentRendererContainerClassesObject: { [key: string]: boolean } = {
      ['content-renderer-container']: true,
      ['has-summary']: this.summary != null,
      ['collapsed']: isCollapsed,
      ['is-figure-content']: isFigureContent,
    };

    const outerContainerclasses = classMap({
      'content-renderer-grid-container': true,
      ['dense']: this.dense ?? false,
    });

    return html`
      <style>
        ${styles}
      </style>
      <div class=${outerContainerclasses}>
        <div class=${classMap(contentRendererContainerClassesObject)}>
          <div
            class=${classMap(mainContentClassesObject)}
            @click=${onContentClick}
          >
            ${this.renderMainContent()}
          </div>
          <lumi-content-summary
            .content=${this.content}
            .summary=${this.summary}
            .spanSummaries=${this.spanSummaries}
            .focusedSpanId=${this.focusedSpanId}
            .isCollapsed=${isCollapsed}
            .onCollapseChange=${() => {
              this.collapseManager.toggleMobileSummaryCollapse(this.content.id);
              this.requestUpdate();
            }}
            .onSpanSummaryMouseEnter=${this.onSpanSummaryMouseEnter}
            .onSpanSummaryMouseLeave=${this.onSpanSummaryMouseLeave}
            .highlightManager=${this.highlightManager}
            .answerHighlightManager=${this.answerHighlightManager}
            .onAnswerHighlightClick=${this.onAnswerHighlightClick}
          >
          </lumi-content-summary>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-content': LumiContentViz;
  }
}
