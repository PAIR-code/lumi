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

/**
 * This component follows a "renderer" pattern. The main `lumi-doc` component
 * remains a LitElement, but its rendering logic for complex sub-parts (like
 * sections and content) is delegated to stateless functions in the `renderers/`
 * directory.
 *
 * This approach was initially chosen to solve a specific problem with `window.getSelection()`
 * not working across Shadow DOM boundaries. By keeping all the text content
 * in the Light DOM of `lumi-doc` and using stateless render functions instead
 * of nested custom elements with their own Shadow DOMs, we ensure that text
 * selection behaves as expected. In a more recent refactor, we've transitioned many
 * components to use LightMobxLitElement, which overrides createRenderRoot to render lit
 * components in Light DOM.
 */

import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HighlightSelection } from "../../shared/selection_utils";

import { renderReferences } from "./renderers/references_renderer";
import { renderFootnotes } from "./renderers/footnotes_renderer";

import "./lumi_abstract";
import "./lumi_section";
import "../lumi_span/lumi_span";
import "../../pair-components/icon_button";
import "../multi_icon_toggle/multi_icon_toggle";

import { styles } from "./lumi_doc.scss";
import { LumiDocManager } from "../../shared/lumi_doc_manager";
import { CollapseManager } from "../../shared/collapse_manager";
import { HighlightManager } from "../../shared/highlight_manager";
import { AnswerHighlightManager } from "../../shared/answer_highlight_manager";

import { LumiFootnote, LumiReference } from "../../shared/lumi_doc";
import { LumiAnswer } from "../../shared/api";
import { LightMobxLitElement } from "../light_mobx_lit_element/light_mobx_lit_element";

/**
 * Displays a Lumi Document.
 */
@customElement("lumi-doc")
export class LumiDocViz extends LightMobxLitElement {
  @property({ type: Object }) lumiDocManager!: LumiDocManager;
  @property({ type: Object }) collapseManager!: CollapseManager;
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) answerHighlightManager!: AnswerHighlightManager;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property()
  onFocusOnSpan: (highlightedSpans: HighlightSelection[]) => void = () => {};
  @property() onPaperReferenceClick: (
    reference: LumiReference,
    target: HTMLElement
  ) => void = () => {};
  @property() onFootnoteClick: (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => void = () => {};
  @property() onConceptClick: (conceptId: string, target: HTMLElement) => void =
    () => {};
  @property() onImageClick?: (
    info: { storagePath: string; caption?: string },
    target: HTMLElement
  ) => void = () => {};
  @property() onAnswerHighlightClick: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void = () => {};
  @property() onScroll: () => void = () => {};

  @state() hoveredSpanId: string | null = null;

  get lumiDoc() {
    return this.lumiDocManager.lumiDoc;
  }

  constructor() {
    super();
  }

  private onSpanSummaryMouseEnter(spanIds: string[]) {
    if (spanIds.length === 0) {
      return;
    }
    this.hoveredSpanId = spanIds[0];
  }

  private onSpanSummaryMouseLeave() {
    this.hoveredSpanId = null;
  }

  private handleLinkClicked() {
    const paperId = this.lumiDocManager.lumiDoc.metadata?.paperId;
    if (paperId) {
      window.open("https://arxiv.org/abs/" + paperId);
    }
  }

  override render() {
    const publishedTimestamp =
      this.lumiDocManager.lumiDoc.metadata?.publishedTimestamp;
    const date = publishedTimestamp
      ? new Date(publishedTimestamp).toLocaleDateString()
      : "";
    return html`
      <style>
        ${styles}
      </style>
      <div class="lumi-doc" @scroll=${this.onScroll.bind(this)}>
        <div class="lumi-doc-content">
          <div class="title-section">
            <h1 class="main-column title">
              ${this.lumiDoc.metadata?.title}
              <pr-icon-button
                icon="open_in_new"
                title="Open in arXiv"
                variant="default"
                @click=${this.handleLinkClicked}
              ></pr-icon-button>
            </h1>
            <div class="main-column date">Published: ${date}</div>
            <div class="main-column authors">
              ${this.lumiDoc.metadata?.authors.join(", ")}
            </div>
          </div>
          <lumi-abstract
            .abstract=${this.lumiDoc.abstract}
            .isCollapsed=${this.collapseManager.isAbstractCollapsed}
            .onCollapseChange=${(isCollapsed: boolean) => {
              this.collapseManager.setAbstractCollapsed(isCollapsed);
            }}
            .onFootnoteClick=${this.onFootnoteClick.bind(this)}
            .onConceptClick=${this.onConceptClick.bind(this)}
            .excerptSpanId=${this.lumiDoc.summaries?.abstractExcerptSpanId}
            .highlightManager=${this.highlightManager}
            .answerHighlightManager=${this.answerHighlightManager}
            .footnotes=${this.lumiDoc.footnotes}
          >
          </lumi-abstract>
          ${this.lumiDoc.sections.map((section) => {
            return html`<lumi-section
              .section=${section}
              .sectionProperties=${{
                parentComponent: this,
                section,
                references: this.lumiDoc.references,
                footnotes: this.lumiDoc.footnotes,
                summaryMaps: this.lumiDocManager.summaryMaps,
                hoverFocusedSpanId: this.hoveredSpanId,
                getImageUrl: this.getImageUrl,
                onSpanSummaryMouseEnter:
                  this.onSpanSummaryMouseEnter.bind(this),
                onSpanSummaryMouseLeave:
                  this.onSpanSummaryMouseLeave.bind(this),
                highlightManager: this.highlightManager,
                answerHighlightManager: this.answerHighlightManager,
                collapseManager: this.collapseManager,
                onFocusOnSpan: this.onFocusOnSpan,
                onPaperReferenceClick: this.onPaperReferenceClick,
                onFootnoteClick: this.onFootnoteClick,
                onImageClick: this.onImageClick,
                onAnswerHighlightClick: this.onAnswerHighlightClick,
                isSubsection: false,
              }}
            >
            </lumi-section>`;
          })}
          ${renderReferences({
            references: this.lumiDoc.references,
            isCollapsed: this.collapseManager.areReferencesCollapsed,
            onCollapseChange: (isCollapsed: boolean) => {
              this.collapseManager.setReferencesCollapsed(isCollapsed);
            },
            highlightManager: this.highlightManager,
            answerHighlightManager: this.answerHighlightManager,
            onAnswerHighlightClick: this.onAnswerHighlightClick,
          })}
          ${renderFootnotes({
            footnotes: this.lumiDoc.footnotes || [],
            isCollapsed: this.collapseManager.areFootnotesCollapsed,
            onCollapseChange: (isCollapsed: boolean) => {
              this.collapseManager.setFootnotesCollapsed(isCollapsed);
            },
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-doc": LumiDocViz;
  }
}
