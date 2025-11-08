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

import {
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { consume } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';

import { scrollContext, ScrollState } from '../../contexts/scroll_context';
import { LumiFont, FocusState } from '../../shared/types';
import {
  ListContent,
  LumiContent,
  LumiFootnote,
  LumiReference,
  LumiSection,
  LumiSpan,
  LumiSummary,
} from '../../shared/lumi_doc';
import { LumiSummaryMaps } from '../../shared/lumi_summary_maps';
import { HighlightManager } from '../../shared/highlight_manager';
import { HighlightSelection } from '../../shared/selection_utils';
import { CollapseManager } from '../../shared/collapse_manager';
import { getAllContents } from '../../shared/lumi_doc_utils';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { LumiAnswer } from '../../shared/api';

import { styles } from './lumi_section.scss';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';

import '../lumi_span/lumi_span';
import '../lumi_content/lumi_content';

const EMPTY_PLACEHOLDER_TEXT = 'section';

/**
 * Displays a lumi section
 */
@customElement('lumi-section')
export class LumiSectionViz extends LightMobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  private sectionRef: Ref<HTMLElement> = createRef();

  @property({ type: Object }) section!: LumiSection;
  @property({ type: Array }) references: LumiReference[] = [];
  @property({ type: Array }) footnotes?: LumiFootnote[];
  @property({ type: Object }) summaryMaps: LumiSummaryMaps | null = null;
  @property({ type: String }) hoverFocusedSpanId: string | null = null;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property({ type: Object }) onSpanSummaryMouseEnter: (
    spanIds: string[]
  ) => void = () => {};
  @property({ type: Object }) onSpanSummaryMouseLeave: () => void = () => {};
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) answerHighlightManager!: AnswerHighlightManager;
  @property({ type: Object }) collapseManager!: CollapseManager;
  @property({ type: Object }) onFocusOnSpan: (
    highlightedSpans: HighlightSelection[]
  ) => void = () => {};
  @property({ type: Object }) onPaperReferenceClick: (
    reference: LumiReference,
    target: HTMLElement
  ) => void = () => {};
  @property({ type: Object }) onFootnoteClick: (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => void = () => {};
  @property({ type: Object }) onImageClick?: (
    info: { storagePath: string; caption?: string },
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;
  @property({ type: Boolean }) isSubsection = false;

  override firstUpdated(_changedProperties: PropertyValues): void {
    this.id = this.section.id;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete.then(() => {
      if (this.sectionRef.value && this.section) {
        this.scrollContext?.registerSection(this.section.id, this.sectionRef);
      }
    });
  }

  override disconnectedCallback() {
    if (this.section) {
      this.scrollContext?.unregisterSection(this.section.id);
    }
    super.disconnectedCallback();
  }

  private renderHeading(): TemplateResult | typeof nothing {
    const { section } = this;
    if (!section.heading) {
      return nothing;
    }

    const headingLevel = section.heading.headingLevel;
    let headingText = section.heading.text;

    const isEmpty = headingText.length === 0;

    const classesObject: { [key: string]: boolean } = {
      'heading-text': true,
      'empty-heading-placeholder': isEmpty,
    };

    if (isEmpty) {
      headingText = EMPTY_PLACEHOLDER_TEXT;
    }

    const onClickStopPropagation = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    const headingContent = html`<span class=${classMap(classesObject)}
      >${headingText}</span
    >`;

    if (headingLevel === 1) {
      return html`<h1 @click=${onClickStopPropagation}>${headingContent}</h1>`;
    } else if (headingLevel === 2) {
      return html`<h2 @click=${onClickStopPropagation}>${headingContent}</h2>`;
    } else if (headingLevel === 3) {
      return html`<h3 @click=${onClickStopPropagation}>${headingContent}</h3>`;
    } else if (headingLevel === 4) {
      return html`<h4 @click=${onClickStopPropagation}>${headingContent}</h4>`;
    } else if (headingLevel === 5) {
      return html`<h5 @click=${onClickStopPropagation}>${headingContent}</h5>`;
    } else if (headingLevel === 6) {
      return html`<h6 @click=${onClickStopPropagation}>${headingContent}</h6>`;
    }

    return nothing;
  }

  private getSpansFromListContent(content: ListContent) {
    let spans: LumiSpan[] = [];
    content.listItems.forEach((item) => {
      spans.push(...item.spans);
    });
    return spans;
  }

  private renderContents(): TemplateResult | typeof nothing {
    return html`<div class="content-viz">
      ${this.section.contents.map((content) => {
        const spans = content.textContent
          ? content.textContent.spans
          : content.listContent
            ? this.getSpansFromListContent(content.listContent!)
            : [];

        const spanSummaries = new Map<string, LumiSummary>();
        spans.forEach((span: LumiSpan) => {
          const summary = this.summaryMaps?.spanSummariesMap.get(span.id);
          if (summary) {
            spanSummaries.set(span.id, summary);
          }
        });

        return html`<lumi-content
          .content=${content}
          .references=${this.references}
          .footnotes=${this.footnotes}
          .getImageUrl=${this.getImageUrl}
          .summary=${this.summaryMaps?.contentSummariesMap.get(content.id) ??
          null}
          .spanSummaries=${spanSummaries}
          .focusedSpanId=${this.hoverFocusedSpanId}
          .onSpanSummaryMouseEnter=${this.onSpanSummaryMouseEnter}
          .onSpanSummaryMouseLeave=${this.onSpanSummaryMouseLeave}
          .highlightManager=${this.highlightManager}
          .answerHighlightManager=${this.answerHighlightManager}
          .collapseManager=${this.collapseManager}
          .onAnswerHighlightClick=${this.onAnswerHighlightClick}
          .onPaperReferenceClick=${this.onPaperReferenceClick}
          .onFootnoteClick=${this.onFootnoteClick}
          .onImageClick=${this.onImageClick}
          .font=${LumiFont.PAPER_TEXT}
          .virtualize=${true}
          .shouldFadeIn=${true}
        ></lumi-content>`;
      })}
      ${this.renderSubsections()}
    </div>`;
  }

  private renderSubsections(): TemplateResult | typeof nothing {
    const { section } = this;
    if (!section.subSections) return nothing;

    return html`${section.subSections.map(
      (subSection) =>
        html`<lumi-section
          class="subsection"
          .section=${subSection}
          .references=${this.references}
          .footnotes=${this.footnotes}
          .summaryMaps=${this.summaryMaps}
          .hoverFocusedSpanId=${this.hoverFocusedSpanId}
          .getImageUrl=${this.getImageUrl}
          .onSpanSummaryMouseEnter=${this.onSpanSummaryMouseEnter}
          .onSpanSummaryMouseLeave=${this.onSpanSummaryMouseLeave}
          .highlightManager=${this.highlightManager}
          .answerHighlightManager=${this.answerHighlightManager}
          .collapseManager=${this.collapseManager}
          .onFocusOnSpan=${this.onFocusOnSpan}
          .onPaperReferenceClick=${this.onPaperReferenceClick}
          .onFootnoteClick=${this.onFootnoteClick}
          .onImageClick=${this.onImageClick}
          .onAnswerHighlightClick=${this.onAnswerHighlightClick}
          .isSubsection=${true}
        >
        </lumi-section>`
    )}`;
  }

  override render() {
    if (!this.section.contents.length && !this.section.heading?.text) {
      return nothing;
    }

    const sectionContainerClasses = {
      ['section-container']: true,
      ['is-subsection']: this.isSubsection,
    };

    return html`
      <style>
        ${styles}
      </style>
      <div
        ${ref(this.sectionRef)}
        id=${this.section.id}
        class="section-ref-container"
      >
        <div class="section-renderer-container">
          <div class=${classMap(sectionContainerClasses)}>
            <div class="heading-grid-container">
              <div class="heading-row">${this.renderHeading()}</div>
            </div>
            ${this.renderContents()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-section': LumiSectionViz;
  }
}
