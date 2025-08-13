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

import "../lumi_doc/lumi_doc";
import "../sidebar/sidebar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Unsubscribe, doc, onSnapshot } from "firebase/firestore";
import { provide } from "@lit/context";

import { core } from "../../core/core";
import { FirebaseService } from "../../services/firebase.service";
import { HistoryService } from "../../services/history.service";
import { DocumentStateService } from "../../services/document_state.service";
import { SnackbarService } from "../../services/snackbar.service";
import {
  LumiDoc,
  LoadingStatus,
  LumiReference,
  LumiFootnote,
  LOADING_STATUS_ERROR_STATES,
} from "../../shared/lumi_doc";
import {
  getArxivMetadata,
  getLumiResponseCallable,
  getPersonalSummaryCallable,
} from "../../shared/callables";
import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import {
  AnswerHighlightTooltipProps,
  ConceptTooltipProps,
  FloatingPanelService,
  FootnoteTooltipProps,
  ReferenceTooltipProps,
  SmartHighlightMenuProps,
} from "../../services/floating_panel_service";
import { LumiAnswer, LumiAnswerRequest } from "../../shared/api";

import { styles } from "./lumi_reader.scss";
import { styles as sectionRendererStyles } from "../lumi_doc/renderers/section_renderer.scss";
import { styles as contentRendererStyles } from "../lumi_doc/renderers/content_renderer.scss";
import { styles as contentSummaryRendererStyles } from "../lumi_doc/renderers/content_summary_renderer.scss";
import { styles as spanRendererStyles } from "../lumi_span/lumi_span_renderer.scss";
import { styles as abstractRendererStyles } from "../lumi_doc/renderers/abstract_renderer.scss";
import { styles as referencesRendererStyles } from "../lumi_doc/renderers/references_renderer.scss";
import { styles as footnotesRendererStyles } from "../lumi_doc/renderers/footnotes_renderer.scss";

import {
  getSelectionInfo,
  HighlightSelection,
  SelectionInfo,
} from "../../shared/selection_utils";
import { createTemporaryAnswer } from "../../shared/answer_utils";
import { classMap } from "lit/directives/class-map.js";
import {
  AnalyticsAction,
  AnalyticsService,
} from "../../services/analytics.service";
import { isViewportSmall } from "../../shared/responsive_utils";
import {
  PERSONAL_SUMMARY_QUERY_NAME,
  SIDEBAR_TABS_MOBILE,
} from "../../shared/constants";
import { LightMobxLitElement } from "../light_mobx_lit_element/light_mobx_lit_element";
import { FirebaseError } from "firebase/app";

/**
 * The component responsible for fetching a single document and passing it
 * to the lumi-doc component.
 */
@customElement("lumi-reader")
export class LumiReader extends LightMobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly firebaseService = core.getService(FirebaseService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly historyService = core.getService(HistoryService);
  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly snackbarService = core.getService(SnackbarService);
  private readonly analyticsService = core.getService(AnalyticsService);

  @provide({ context: scrollContext })
  private scrollState = new ScrollState();

  @property({ type: String }) documentId = "";

  private unsubscribeListener?: Unsubscribe;

  override connectedCallback() {
    super.connectedCallback();
    this.documentStateService.setScrollState(this.scrollState);
    if (this.documentId) {
      this.loadDocument();
    }

    document.onselectionchange = () => {
      const selection = window.getSelection();

      if (!selection) return;

      const selectionInfo = getSelectionInfo(
        selection,
        this.floatingPanelService.selectionShadowRoots
      );

      if (selectionInfo) {
        this.handleTextSelection(selectionInfo);
      }
    };
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
  }

  private registerShadowRoot(shadowRoot: ShadowRoot) {
    this.floatingPanelService.registerShadowRoot(shadowRoot);
  }

  private unregisterShadowRoot(shadowRoot: ShadowRoot) {
    this.floatingPanelService.unregisterShadowRoot(shadowRoot);
  }

  private async loadDocument() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }

    const metadata = await getArxivMetadata(
      this.firebaseService.functions,
      this.documentId
    );

    if (!metadata || !metadata.version) {
      this.snackbarService.show(
        "Warning: Document metadata or version not found."
      );
      return;
    }

    // Add the paper to local storage history if it does not yet exist.
    const paperData = this.historyService.getPaperData(this.documentId);
    if (!paperData) {
      this.historyService.addPaper(this.documentId, metadata);
    }

    const docPath = `arxiv_docs/${this.documentId}/versions/${metadata.version}`;
    this.unsubscribeListener = onSnapshot(
      doc(this.firebaseService.firestore, docPath),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LumiDoc;
          this.documentStateService.setDocument(data);
          this.requestUpdate();

          if (data.loadingStatus === LoadingStatus.SUCCESS) {
            // Once the document is fully loaded, check for personal summary.
            if (!this.historyService.personalSummaries.has(this.documentId)) {
              this.fetchPersonalSummary();
            }
          }

          const message = LOADING_STATUS_ERROR_STATES.includes(
            data.loadingStatus as LoadingStatus
          )
            ? `Error loading document: ${this.documentId}`
            : "Document loaded";
          this.snackbarService.show(message);
        } else {
          this.snackbarService.show(`Document ${this.documentId} not found.`);
        }
      },
      (error) => {
        this.snackbarService.show(`Error loading document: ${error.message}`);
        console.error(error);
      }
    );
  }

  private async fetchPersonalSummary() {
    const currentDoc = this.documentStateService.lumiDocManager?.lumiDoc;
    if (!currentDoc) return;

    const tempAnswer = createTemporaryAnswer({
      query: PERSONAL_SUMMARY_QUERY_NAME,
    });
    this.historyService.addTemporaryAnswer(tempAnswer);

    try {
      // Filter out the current paper.
      const pastPapers = this.historyService
        .getPaperHistory()
        .filter(
          (paper) =>
            paper.metadata.paperId !== this.documentId &&
            paper.status === "complete"
        );
      const summaryAnswer = await getPersonalSummaryCallable(
        this.firebaseService.functions,
        currentDoc,
        pastPapers
      );

      this.historyService.addPersonalSummary(this.documentId, summaryAnswer);
    } catch (e) {
      console.error("Error getting personal summary:", e);
      this.snackbarService.show("Error: Could not generate personal summary.");
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
    }
  }

  private get getImageUrl() {
    return (path: string) => this.firebaseService.getDownloadUrl(path);
  }

  private checkOpenMobileSidebar() {
    if (isViewportSmall()) {
      const { collapseManager } = this.documentStateService;
      if (collapseManager) {
        if (collapseManager.isMobileSidebarCollapsed) {
          collapseManager.toggleMobileSidebarCollapsed();
        }
        if (
          collapseManager.sidebarTabSelection !== SIDEBAR_TABS_MOBILE.ANSWERS
        ) {
          collapseManager.setSidebarTabSelection(SIDEBAR_TABS_MOBILE.ANSWERS);
        }
      }
    }
  }

  private readonly handleDefine = async (
    text: string,
    highlightedSpans: HighlightSelection[]
  ) => {
    if (!this.documentStateService.lumiDocManager) return;

    const request: LumiAnswerRequest = {
      query: ``,
      highlight: text,
      highlightedSpans,
    };

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);

    this.checkOpenMobileSidebar();

    try {
      const response = await getLumiResponseCallable(
        this.firebaseService.functions,
        this.documentStateService.lumiDocManager.lumiDoc,
        request
      );
      this.historyService.addAnswer(this.documentId, response);
    } catch (e) {
      console.error("Error getting Lumi response:", e);
      let message = "Error: Could not get response from Lumi.";
      if ((e as FirebaseError).code === "functions/resource-exhausted") {
        message =
          "Model quota exceeded. Add your own API key in Home > Settings";
      }

      this.snackbarService.show(message, 5000);
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
    }
  };

  private readonly handleAsk = async (
    highlightedText: string,
    query: string,
    highlightedSpans: HighlightSelection[]
  ) => {
    const currentDoc = this.documentStateService.lumiDocManager?.lumiDoc;
    if (!currentDoc) return;

    const request: LumiAnswerRequest = {
      highlight: highlightedText,
      query: query,
      highlightedSpans,
    };

    this.checkOpenMobileSidebar();

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);

    try {
      const response = await getLumiResponseCallable(
        this.firebaseService.functions,
        currentDoc,
        request
      );
      this.historyService.addAnswer(this.documentId, response);
    } catch (e) {
      console.error("Error getting Lumi response:", e);
      this.snackbarService.show("Error: Could not get response from Lumi.");
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
    }
  };

  private readonly handleConceptClick = (id: string, target: HTMLElement) => {
    this.analyticsService.trackAction(AnalyticsAction.READER_CONCEPT_CLICK);

    const concept =
      this.documentStateService.lumiDocManager?.getConceptById(id);
    if (!concept) return;

    const props = new ConceptTooltipProps(concept);
    this.floatingPanelService.show(props, target);
  };

  private readonly handleScroll = () => {
    if (this.floatingPanelService.isVisible) {
      this.floatingPanelService.hide();
    }
  };

  private readonly handleTextSelection = (selectionInfo: SelectionInfo) => {
    this.analyticsService.trackAction(AnalyticsAction.READER_TEXT_SELECTION);
    const props = new SmartHighlightMenuProps(
      selectionInfo.selectedText,
      selectionInfo.highlightSelection,
      this.handleDefine.bind(this),
      this.handleAsk.bind(this)
    );
    this.floatingPanelService.show(props, selectionInfo.parentSpan);
  };

  private readonly handlePaperReferenceClick = (
    reference: LumiReference,
    target: HTMLElement
  ) => {
    const props = new ReferenceTooltipProps(reference);
    this.floatingPanelService.show(props, target);
  };

  private readonly handleFootnoteClick = (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => {
    const props = new FootnoteTooltipProps(footnote);
    this.floatingPanelService.show(props, target);
  };

  private readonly handleAnswerHighlightClick = (
    answer: LumiAnswer,
    target: HTMLElement
  ) => {
    const props = new AnswerHighlightTooltipProps(answer);
    this.floatingPanelService.show(props, target);
  };

  override render() {
    const currentDoc = this.documentStateService.lumiDocManager?.lumiDoc;

    // TODO: Add more descriptive/accurate message based on document status
    if (!currentDoc) return html`<div>Document loading...</div>`;

    if (
      currentDoc.loadingStatus === LoadingStatus.LOADING ||
      currentDoc.loadingStatus === LoadingStatus.WAITING
    ) {
      return html`<div class="loading-message">Loading document...</div>`;
    }

    const sidebarWrapperClasses = classMap({
      ["sidebar-wrapper"]: true,
      ["is-mobile-sidebar-collapsed"]:
        this.documentStateService.collapseManager?.isMobileSidebarCollapsed ??
        false,
    });

    return html`
      <style>
        ${styles}
        ${abstractRendererStyles}
        ${sectionRendererStyles}
        ${contentRendererStyles}
        ${contentSummaryRendererStyles}
        ${spanRendererStyles}
        ${referencesRendererStyles}
        ${footnotesRendererStyles}
      </style>
      <div
        class=${sidebarWrapperClasses}
        @mousedown=${() => {
          this.floatingPanelService.hide();
        }}
      >
        <lumi-sidebar></lumi-sidebar>
      </div>
      <div
        class="doc-wrapper"
        @mousedown=${() => {
          this.floatingPanelService.hide();
          this.documentStateService.highlightManager?.clearHighlights();
        }}
      >
        <lumi-doc
          .lumiDocManager=${this.documentStateService.lumiDocManager}
          .highlightManager=${this.documentStateService.highlightManager}
          .answerHighlightManager=${this.historyService.answerHighlightManager}
          .collapseManager=${this.documentStateService.collapseManager}
          .getImageUrl=${this.getImageUrl.bind(this)}
          .onConceptClick=${this.handleConceptClick.bind(this)}
          .onScroll=${this.handleScroll.bind(this)}
          .onFocusOnSpan=${(highlights: HighlightSelection[]) => {
            this.documentStateService.focusOnSpan(highlights, "gray");
          }}
          .registerShadowRoot=${this.registerShadowRoot.bind(this)}
          .unregisterShadowRoot=${this.unregisterShadowRoot.bind(this)}
          .onPaperReferenceClick=${this.handlePaperReferenceClick.bind(this)}
          .onFootnoteClick=${this.handleFootnoteClick.bind(this)}
          .onAnswerHighlightClick=${this.handleAnswerHighlightClick.bind(this)}
        ></lumi-doc>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-reader": LumiReader;
  }
}
