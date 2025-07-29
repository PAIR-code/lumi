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
 * This approach was chosen to solve a specific problem with `window.getSelection()`
 * not working across Shadow DOM boundaries. By keeping all the text content
 * in the Light DOM of `lumi-doc` and using stateless render functions instead
 * of nested custom elements with their own Shadow DOMs, we ensure that text
 * selection behaves as expected.
 *
 * The one exception is `lumi-span`, which remains a custom element. However, it
 * has been modified to accept its rendered content via a `<slot>`. This means
 * the text content is *projected* into `lumi-span`'s Shadow DOM but still
 * *owned* by `lumi-doc`'s Light DOM, preserving selectability.
 */

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  getSelectionInfo,
  HighlightSelection,
  SelectionInfo,
} from "../../shared/selection_utils";

import { renderSection } from "./renderers/section_renderer";
import { renderAbstract } from "./renderers/abstract_renderer";
import { renderReferences } from "./renderers/references_renderer";

import "../lumi_span/lumi_span";
import "../../pair-components/icon_button";
import "../multi_icon_toggle/multi_icon_toggle";

import { styles } from "./lumi_doc.scss";
import { styles as sectionRendererStyles } from "./renderers/section_renderer.scss";
import { styles as contentRendererStyles } from "./renderers/content_renderer.scss";
import { styles as contentSummaryRendererStyles } from "./renderers/content_summary_renderer.scss";
import { styles as spanRendererStyles } from "../lumi_span/lumi_span_renderer.scss";
import { styles as abstractRendererStyles } from "./renderers/abstract_renderer.scss";
import { styles as referencesRendererStyles } from "./renderers/references_renderer.scss";
import { LumiDocManager } from "../../shared/lumi_doc_manager";
import { CollapseManager } from "../../shared/collapse_manager";
import { HighlightManager } from "../../shared/highlight_manager";

import { createRef, ref, Ref } from "lit/directives/ref.js";
import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import { consume } from "@lit/context";
import { LumiReference } from "../../shared/lumi_doc";

/**
 * Displays a Lumi Document.
 */
@customElement("lumi-doc")
export class LumiDocViz extends MobxLitElement {
  static override styles: CSSResultGroup = [
    styles,
    sectionRendererStyles,
    contentRendererStyles,
    contentSummaryRendererStyles,
    spanRendererStyles,
    abstractRendererStyles,
    referencesRendererStyles,
  ];

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  @property({ type: Object }) lumiDocManager!: LumiDocManager;
  @property({ type: Object }) collapseManager!: CollapseManager;
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property()
  onTextSelection: (selectionInfo: SelectionInfo) => void = () => {};
  @property()
  onFocusOnSpan: (highlightedSpans: HighlightSelection[]) => void = () => {};
  @property() onPaperReferenceClick: (
    reference: LumiReference,
    target: HTMLElement
  ) => void = () => {};

  @state() hoveredSpanId: string | null = null;

  private sectionRefs = new Map<string, Ref<HTMLElement>>();

  get lumiDoc() {
    return this.lumiDocManager.lumiDoc;
  }

  constructor() {
    super();
  }

  private handleMouseUp(e: MouseEvent) {
    const selection = window.getSelection();
    if (!selection || !this.shadowRoot) {
      return;
    }

    const selectionInfo = getSelectionInfo(selection, this.shadowRoot);
    if (selectionInfo) {
      this.onTextSelection(selectionInfo);
      // Stop the event from propagating. This prevents the `md-menu` from
      // immediately closing, as it interprets the `mouseup` event on the
      // document as an "outside click".
      e.stopPropagation();
    }
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

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete.then(() => {
      for (const [id, ref] of this.sectionRefs.entries()) {
        if (ref.value) {
          this.scrollContext?.registerSection(id, ref);
        }
      }
    });
  }

  override render() {
    const publishedTimestamp =
      this.lumiDocManager.lumiDoc.metadata?.publishedTimestamp;
    const date = publishedTimestamp
      ? new Date(publishedTimestamp).toLocaleDateString()
      : "";
    return html`
      <div
        class="lumi-doc"
        @mouseup=${(e: MouseEvent) => {
          window.setTimeout(() => {
            this.handleMouseUp(e);
          });
        }}
      >
        <div class="collapse-toggle-container">
          <multi-icon-toggle
            .selection=${this.collapseManager.getOverallCollapseState()}
            @onCollapseAll=${() => {
              this.collapseManager.setAllSectionsCollapsed(true);
            }}
            @onExpandAll=${() => {
              this.collapseManager.setAllSectionsCollapsed(false);
            }}
          >
          </multi-icon-toggle>
        </div>
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
          ${renderAbstract({
            abstract: this.lumiDoc.abstract,
            isCollapsed: this.collapseManager.isAbstractCollapsed,
            onCollapseChange: (isCollapsed: boolean) => {
              this.collapseManager.setAbstractCollapsed(isCollapsed);
            },
            excerptSpanId: this.lumiDoc.summaries?.abstractExcerptSpanId,
            highlightManager: this.highlightManager,
          })}
          ${this.lumiDoc.sections.map((section) => {
            const isCollapsed = this.collapseManager?.getCollapseState(
              section.id
            );
            const sectionRef = createRef<HTMLElement>();
            this.sectionRefs.set(section.id, sectionRef);

            return html`<div ${ref(sectionRef)}>
              ${renderSection({
                parentComponent: this,
                section,
                references: this.lumiDoc.references,
                summaryMaps: this.lumiDocManager.summaryMaps,
                hoverFocusedSpanId: this.hoveredSpanId,
                isCollapsed: isCollapsed,
                onCollapseChange: (isCollapsed: boolean) => {
                  this.collapseManager!.toggleSection(section.id, isCollapsed);
                },
                getImageUrl: this.getImageUrl,
                onSpanSummaryMouseEnter:
                  this.onSpanSummaryMouseEnter.bind(this),
                onSpanSummaryMouseLeave:
                  this.onSpanSummaryMouseLeave.bind(this),
                highlightManager: this.highlightManager,
                collapseManager: this.collapseManager,
                onFocusOnSpan: this.onFocusOnSpan,
                onPaperReferenceClick: this.onPaperReferenceClick,
                isSubsection: false,
              })}
            </div>`;
          })}
          ${renderReferences({
            references: this.lumiDoc.references,
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
