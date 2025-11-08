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

import '../lumi_doc/lumi_doc';
import '../sidebar/sidebar';
import '../loading_document/loading_document';
import '../../pair-components/circular_progress';
import '../../pair-components/button';
import '../../pair-components/icon_button';

import { CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { core } from '../../core/core';
import { ApiService } from '../../services/api.service';
import { HistoryService } from '../../services/history.service';
import { DocumentStateService } from '../../services/document_state.service';
import { SnackbarService } from '../../services/snackbar.service';
import {
  LumiDoc,
  LoadingStatus,
  LumiReference,
  LumiFootnote,
  LOADING_STATUS_ERROR_STATES,
  ArxivMetadata,
} from '../../shared/lumi_doc';
import {
  getArxivMetadata,
  getLumiResponseCallable,
  getPersonalSummaryCallable,
} from '../../shared/api_callables';
import { scrollContext, ScrollState } from '../../contexts/scroll_context';
import {
  AnswerHighlightTooltipProps,
  ConceptTooltipProps,
  FloatingPanelService,
  FootnoteTooltipProps,
  ReferenceTooltipProps,
  SmartHighlightMenuProps,
} from '../../services/floating_panel_service';
import { ImageInfo, LumiAnswer, LumiAnswerRequest } from '../../shared/api';

import { styles } from './lumi_reader.scss';

import {
  getSelectionInfo,
  HighlightSelection,
  SelectionInfo,
} from '../../shared/selection_utils';
import { createTemporaryAnswer } from '../../shared/answer_utils';
import { classMap } from 'lit/directives/class-map.js';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';
import { isViewportSmall } from '../../shared/responsive_utils';
import {
  PERSONAL_SUMMARY_QUERY_NAME,
  SIDEBAR_TABS,
} from '../../shared/constants';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { RouterService, getArxivPaperUrl } from '../../services/router.service';
import { BannerService } from '../../services/banner.service';
import { createRef, ref } from 'lit/directives/ref.js';
import { SettingsService } from '../../services/settings.service';
import {
  DialogService,
  TOSDialogProps,
  TutorialDialogProps,
} from '../../services/dialog.service';

const LOADING_STATES_ALLOW_PERSONAL_SUMMARY: string[] = [
  LoadingStatus.SUCCESS,
  LoadingStatus.SUMMARIZING,
  LoadingStatus.ERROR_SUMMARIZING,
  LoadingStatus.ERROR_SUMMARIZING_INVALID_RESPONSE,
  LoadingStatus.ERROR_SUMMARIZING_QUOTA_EXCEEDED,
];

const LOADING_STATES_RENDER_ERROR: string[] = [
  LoadingStatus.ERROR_DOCUMENT_LOAD_INVALID_RESPONSE,
  LoadingStatus.ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED,
  LoadingStatus.ERROR_DOCUMENT_LOAD,
  LoadingStatus.TIMEOUT,
];

const TUTORIAL_DIALOG_DELAY = 800;

/**
 * The component responsible for fetching a single document and passing it
 * to the lumi-doc component.
 */
@customElement('lumi-reader')
export class LumiReader extends LightMobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly apiService = core.getService(ApiService);
  private readonly bannerService = core.getService(BannerService);
  private readonly dialogService = core.getService(DialogService);
  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly historyService = core.getService(HistoryService);
  private readonly routerService = core.getService(RouterService);
  private readonly snackbarService = core.getService(SnackbarService);
  private readonly settingsService = core.getService(SettingsService);

  @provide({ context: scrollContext })
  private scrollState = new ScrollState();

  @property({ type: String }) documentId = '';
  @state() loadingStatus = LoadingStatus.UNSET;
  @state() metadata?: ArxivMetadata;
  @state() metadataNotFound? = false;

  @state() hoveredSpanId: string | null = null;

  private mobileSmartHighlightContainerRef = createRef<HTMLElement>();

  private websocket?: WebSocket;

  override connectedCallback() {
    super.connectedCallback();
    this.documentStateService.setScrollState(this.scrollState);
    this.historyService.setScrollState(this.scrollState);
    if (this.documentId) {
      this.loadDocument();
    }

    document.onselectionchange = () => {
      const selection = window.getSelection();

      if (!selection) return;

      const selectionInfo = getSelectionInfo(selection);

      if (selectionInfo) {
        this.handleTextSelection(selectionInfo);
      }
    };
  }

  private showPopupDialogs() {
    if (!this.settingsService.isTosConfirmed.value) {
      const onClose = () => {
        this.dialogService.show(new TutorialDialogProps());
      };
      this.dialogService.show(new TOSDialogProps(onClose));
    } else if (!this.settingsService.isTutorialConfirmed.value) {
      window.setTimeout(() => {
        this.dialogService.show(new TutorialDialogProps());
      }, TUTORIAL_DIALOG_DELAY);
    }
  }

  override disconnectedCallback() {
    this.bannerService.clearBannerProperties();

    super.disconnectedCallback();
    if (this.websocket) {
      this.websocket.close();
    }
  }

  private setLoadingStatus(status: LoadingStatus) {
    if (status === this.loadingStatus) return;

    if (status === LoadingStatus.SUMMARIZING) {
      this.bannerService.setBannerProperties({
        message: 'Loading summaries...',
        icon: 'hourglass',
      });
    } else {
      if (this.bannerService.isBannerOpen) {
        this.bannerService.clearBannerProperties();
      }
    }

    if (status === LoadingStatus.SUCCESS) {
      this.showPopupDialogs();
    }

    this.loadingStatus = status;
  }

  private async loadDocument() {
    // Guard against undefined or empty documentId
    if (!this.documentId || this.documentId === 'undefined') {
      this.metadataNotFound = true;
      return;
    }

    if (this.websocket) {
      this.websocket.close();
    }

    let metadata: ArxivMetadata | null = null;
    try {
      metadata = await getArxivMetadata(this.apiService, this.documentId);
    } catch (error) {
      console.error('Warning: Document metadata or version not found.', error);
    }

    if (!metadata || !metadata.version) {
      this.metadataNotFound = true;
      return;
    }

    // Add the paper to local storage history if it does not yet exist.
    const paperData = this.historyService.getPaperData(this.documentId);
    if (!paperData) {
      this.historyService.addPaper(this.documentId, metadata);
    }

    this.websocket = this.apiService.connectDocumentSocket(
      this.documentId,
      metadata.version,
      (data) => {
        const lumiDoc = data as LumiDoc;

        if (
          lumiDoc.loadingStatus === LoadingStatus.SUCCESS ||
          lumiDoc.loadingStatus === LoadingStatus.SUMMARIZING
        ) {
          this.documentStateService.setDocument(lumiDoc);
        }

        this.setLoadingStatus(lumiDoc.loadingStatus as LoadingStatus);
        this.metadata = lumiDoc.metadata;
        this.requestUpdate();

        if (
          LOADING_STATES_ALLOW_PERSONAL_SUMMARY.includes(lumiDoc.loadingStatus)
        ) {
          // Once the document is fully loaded, check for personal summary.
          if (!this.historyService.personalSummaries.has(this.documentId)) {
            this.fetchPersonalSummary();
          }
        }

        if (
          LOADING_STATUS_ERROR_STATES.includes(
            lumiDoc.loadingStatus as LoadingStatus
          )
        ) {
          this.snackbarService.show(
            `Error loading document: ${this.documentId}`
          );
        }
      },
      (error) => {
        this.snackbarService.show(`Error loading document`);
        console.error('WebSocket error:', error);
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
            paper.status === 'complete'
        );
      const summaryAnswer = await getPersonalSummaryCallable(
        this.apiService,
        currentDoc,
        pastPapers,
        this.settingsService.apiKey.value
      );

      this.historyService.addPersonalSummary(this.documentId, summaryAnswer);
    } catch (e) {
      console.error('Error getting personal summary:', e);
      this.snackbarService.show('Error: Could not generate personal summary.');
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
    }
  }

  private get getImageUrl() {
    return (path: string) => this.apiService.getDownloadUrl(path);
  }

  private checkChangeTabs() {
    const { collapseManager } = this.documentStateService;
    if (!collapseManager) return;

    if (isViewportSmall() && collapseManager.isMobileSidebarCollapsed) {
      collapseManager.toggleMobileSidebarCollapsed();
    }

    if (collapseManager.sidebarTabSelection !== SIDEBAR_TABS.ANSWERS) {
      collapseManager.setSidebarTabSelection(SIDEBAR_TABS.ANSWERS);
    }
  }

  private readonly handleDefine = async (
    text: string,
    highlightedSpans: HighlightSelection[],
    imageInfo?: ImageInfo
  ) => {
    if (!this.documentStateService.lumiDocManager) return;

    const request: LumiAnswerRequest = {
      query: ``,
      highlight: text,
      highlightedSpans,
      image: imageInfo,
    };

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);

    this.checkChangeTabs();

    try {
      const response = await getLumiResponseCallable(
        this.apiService,
        this.documentStateService.lumiDocManager.lumiDoc,
        request,
        this.settingsService.apiKey.value
      );
      this.historyService.addAnswer(this.documentId, response);
    } catch (e) {
      let message = 'Error: Could not get response from Lumi.';
      const errorMessage = (e as Error).message || '';

      if (
        errorMessage.includes('unavailable') &&
        this.settingsService.apiKey.value !== ''
      ) {
        message = 'Error: Your API key may be incorrect';
      } else if (
        errorMessage.includes('resource-exhausted') ||
        errorMessage.includes('quota')
      ) {
        message =
          'Model quota exceeded. Add your own API key in Home > Settings';
      }

      this.snackbarService.show(message, 5000);
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
    }
  };

  private readonly handleAsk = async (
    highlightedText: string,
    query: string,
    highlightedSpans: HighlightSelection[],
    imageInfo?: ImageInfo
  ) => {
    const currentDoc = this.documentStateService.lumiDocManager?.lumiDoc;
    if (!currentDoc) return;

    const request: LumiAnswerRequest = {
      highlight: highlightedText,
      query: query,
      highlightedSpans,
      image: imageInfo,
    };

    this.checkChangeTabs();

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);

    try {
      const response = await getLumiResponseCallable(
        this.apiService,
        currentDoc,
        request,
        this.settingsService.apiKey.value
      );
      this.historyService.addAnswer(this.documentId, response);
    } catch (e) {
      console.error('Error getting Lumi response:', e);
      this.snackbarService.show('Error: Could not get response from Lumi.');
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

    this.hoveredSpanId = null;
  };

  private readonly handleTextSelection = (selectionInfo: SelectionInfo) => {
    this.analyticsService.trackAction(AnalyticsAction.READER_TEXT_SELECTION);

    const props = new SmartHighlightMenuProps(
      selectionInfo.selectedText,
      selectionInfo.highlightSelection,
      this.handleDefine.bind(this),
      this.handleAsk.bind(this)
    );

    if (isViewportSmall()) {
      if (this.mobileSmartHighlightContainerRef.value) {
        this.floatingPanelService.show(
          props,
          this.mobileSmartHighlightContainerRef.value
        );
      }
    } else {
      this.floatingPanelService.show(props, selectionInfo.parentSpan);
    }
  };

  private readonly handleImageClick = (
    info: ImageInfo,
    target: HTMLElement
  ) => {
    this.analyticsService.trackAction(AnalyticsAction.READER_IMAGE_CLICK);

    const props = new SmartHighlightMenuProps(
      '',
      [],
      this.handleDefine.bind(this),
      this.handleAsk.bind(this),
      info
    );
    this.floatingPanelService.show(props, target);
    this.documentStateService.highlightManager?.addImageHighlight(
      info.imageStoragePath
    );
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

  private readonly handleHomeClick = () => {
    this.routerService.navigateToDefault();
  };

  private onSpanSummaryMouseEnter(spanIds: string[]) {
    if (spanIds.length === 0) {
      return;
    }
    this.hoveredSpanId = spanIds[0];
  }

  private onSpanSummaryMouseLeave() {
    this.hoveredSpanId = null;
  }

  private renderLoadingMetadata() {
    return html`<div class="loading-metadata-container status-container">
      <div class="loading-metadata status-inner-container">
        <div class="spinner">
          <pr-circular-progress></pr-circular-progress>
        </div>
        <span class="loading-metadata-text">Loading document</span>
      </div>
    </div>`;
  }

  private renderNotFound() {
    return html`<div class="error-container status-container">
      <div class="error-inner-container status-inner-container">
        <span class="not-found-header">404</span>
        <span class="not-found-body">Page not found</span>
        <div class="error-footer">
          <pr-button variant="tonal" @click=${this.handleHomeClick}
            >Back to Lumi home</pr-button
          >
        </div>
      </div>
    </div>`;
  }

  private renderError(metadata?: ArxivMetadata) {
    return html`<div class="error-container status-container">
      <div class="error-inner-container status-inner-container">
        <span class="error-header">Something went wrong...</span>
        <span class="error-body"
          >Could not import: "${metadata?.title}"
          <a
            href=${getArxivPaperUrl(this.metadata?.paperId ?? '')}
            class="arxiv-link"
            rel="noopener noreferrer"
          >
            <pr-icon-button
              class="open-button"
              variant="default"
              icon="open_in_new"
              title="Open paper in arXiv"
            >
            </pr-icon-button>
          </a>
        </span>
        <div class="error-footer">
          <pr-button variant="tonal" @click=${this.handleHomeClick}
            >Back to Lumi home</pr-button
          >
        </div>
      </div>
    </div>`;
  }

  private renderImportingDocumentLoadingState(metadata?: ArxivMetadata) {
    return html`<loading-document
      .onBackClick=${this.handleHomeClick}
      .metadata=${metadata}
    ></loading-document>`;
  }

  private renderWithStyles(content: TemplateResult) {
    return html`
      <style>
        ${styles}
      </style>
      ${content}
    `;
  }

  private renderMobileSmartHighlightMenu() {
    if (!isViewportSmall()) return nothing;
    return html`
      <div
        ${ref(this.mobileSmartHighlightContainerRef)}
        class="smart-highlight-menu-container"
      ></div>
    `;
  }

  private clearHighlightsAndMenus() {
    this.floatingPanelService.hide();
    this.documentStateService.highlightManager?.clearHighlights();
  }

  override render() {
    if (this.metadataNotFound) {
      return this.renderWithStyles(this.renderNotFound());
    }

    if (this.loadingStatus === LoadingStatus.UNSET) {
      return this.renderWithStyles(this.renderLoadingMetadata());
    }

    if (this.loadingStatus === LoadingStatus.WAITING) {
      return this.renderWithStyles(
        this.renderImportingDocumentLoadingState(this.metadata)
      );
    }

    if (LOADING_STATES_RENDER_ERROR.includes(this.loadingStatus)) {
      return this.renderWithStyles(this.renderError(this.metadata));
    }

    const sidebarWrapperClasses = classMap({
      ['sidebar-wrapper']: true,
      ['is-mobile-sidebar-collapsed']:
        this.documentStateService.collapseManager?.isMobileSidebarCollapsed ??
        false,
    });

    return this.renderWithStyles(html`
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
          this.clearHighlightsAndMenus();
        }}
      >
        <lumi-doc
          .lumiDocManager=${this.documentStateService.lumiDocManager}
          .highlightManager=${this.documentStateService.highlightManager}
          .answerHighlightManager=${this.historyService.answerHighlightManager}
          .collapseManager=${this.documentStateService.collapseManager}
          .getImageUrl=${this.getImageUrl.bind(this)}
          .onConceptClick=${this.handleConceptClick.bind(this)}
          .onImageClick=${this.handleImageClick.bind(this)}
          .onScroll=${this.handleScroll.bind(this)}
          .onFocusOnSpan=${(highlights: HighlightSelection[]) => {
            this.documentStateService.focusOnSpan(highlights, 'gray');
          }}
          .onPaperReferenceClick=${this.handlePaperReferenceClick.bind(this)}
          .onFootnoteClick=${this.handleFootnoteClick.bind(this)}
          .onAnswerHighlightClick=${this.handleAnswerHighlightClick.bind(this)}
          .onSpanSummaryMouseEnter=${this.onSpanSummaryMouseEnter.bind(this)}
          .onSpanSummaryMouseLeave=${this.onSpanSummaryMouseLeave.bind(this)}
          .hoveredSpanId=${this.hoveredSpanId}
        ></lumi-doc>
      </div>
      ${this.renderMobileSmartHighlightMenu()}
    `);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-reader': LumiReader;
  }
}
