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

import "../../pair-components/textarea";
import "../../pair-components/icon_button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Unsubscribe, doc, onSnapshot } from "firebase/firestore";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { HomeService } from "../../services/home.service";
import { HistoryService } from "../../services/history.service";
import { Pages, RouterService } from "../../services/router.service";
import { FirebaseService } from "../../services/firebase.service";
import { SnackbarService } from "../../services/snackbar.service";

import { LumiDoc, LoadingStatus, ArxivMetadata } from "../../shared/lumi_doc";
import {
  requestArxivDocImportCallable,
  RequestArxivDocImportResult,
} from "../../shared/callables";
import { extractArxivId } from "../../shared/string_utils";

import { styles } from "./home_gallery.scss";
import { makeObservable, observable, ObservableMap } from "mobx";
import { PaperData } from "../../shared/types_local_storage";
import { sortPaperDataByTimestamp } from "../../shared/lumi_paper_utils";
import { MAX_IMPORT_URL_LENGTH } from "../../shared/constants";

/** Gallery for home/landing page */
@customElement("home-gallery")
export class HomeGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly historyService = core.getService(HistoryService);
  private readonly snackbarService = core.getService(SnackbarService);

  // Paper URL or ID for text input box
  @state() private paperInput: string = "";
  /**
   * Holds the metadata of the paper being loaded. This is used to render a
   * temporary, disabled "loading" card in the UI.
   */
  @state() private isLoadingMetadata = false;

  @observable.shallow private unsubscribeListeners = new ObservableMap<
    string,
    Unsubscribe
  >();

  constructor() {
    super();
    makeObservable(this);
  }

  get isLoadingDocument(): boolean {
    return this.unsubscribeListeners.size > 0 || this.isLoadingMetadata;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.historyService.paperMetadata.forEach((metadata, paperId) => {
      const paperData = this.historyService.getPaperData(paperId);
      if (paperData && paperData.status === "loading") {
        this.listenForDocReady(paperId, metadata);
      }
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeListeners.clear();
  }

  private async requestDocument(id: string) {
    const response = await requestArxivDocImportCallable(
      this.firebaseService.functions,
      id
    );
    return response;
  }

  private async loadDocument() {
    // Extract arXiv ID from potential paper link
    const paperId = extractArxivId(this.paperInput);
    if (!paperId) {
      // Paper ID is only empty if input was empty or invalid
      this.snackbarService.show(`Error: Invalid arXiv URL or ID`);
      return;
    }

    this.isLoadingMetadata = true;
    let response: RequestArxivDocImportResult;

    const existingPapers = this.historyService.getPaperHistory();
    const foundPaper = existingPapers.find(
      (paper) => paper.metadata.paperId === paperId
    );
    if (foundPaper && foundPaper.status === "complete") {
      this.snackbarService.show("Paper already loaded.");
    }

    try {
      response = await this.requestDocument(paperId);
    } catch (error) {
      this.snackbarService.show(`Error: ${(error as Error).message}`);
      return;
    } finally {
      this.isLoadingMetadata = false;
    }

    if (response.error) {
      this.snackbarService.show(`Error: ${response.error}`);
      return;
    }

    // Reset paper input
    this.paperInput = "";

    const metadata = response.metadata;
    if (!metadata || !metadata.version) {
      this.snackbarService.show("Error: Document not found.");
      return;
    }

    // This will add the paper to local storage with 'loading' status
    // and update the reactive `paperMetadata` map in historyService.
    this.historyService.addLoadingPaper(paperId, metadata);
    this.listenForDocReady(paperId, metadata);
  }

  private listenForDocReady(paperId: string, metadata: ArxivMetadata) {
    // If there's an existing listener for this paper, unsubscribe first.
    if (this.unsubscribeListeners.has(paperId)) {
      this.unsubscribeListeners.get(paperId)?.();
    }

    const docPath = `arxiv_docs/${paperId}/versions/${metadata.version}`;
    const unsubscribe = onSnapshot(
      doc(this.firebaseService.firestore, docPath),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LumiDoc;
          // Once the document has loaded successfully, update its status
          // to 'complete' and unsubscribe.
          if (data.loadingStatus === LoadingStatus.SUCCESS) {
            this.historyService.addPaper(paperId, metadata);
            this.homeService.addDocument(data);
            this.unsubscribeListeners.get(paperId)?.();
            this.unsubscribeListeners.delete(paperId);
            this.snackbarService.show("Document loaded.");
          } else if (data.loadingStatus === LoadingStatus.ERROR) {
            this.historyService.deletePaper(paperId);
            this.unsubscribeListeners.get(paperId)?.();
            this.unsubscribeListeners.delete(paperId);
            this.snackbarService.show(`${data.loadingError}`);
          }
        }
      }
    );
    this.unsubscribeListeners.set(paperId, unsubscribe);
  }

  override render() {
    const renderHistoryItem = (paperData: PaperData) => {
      const { metadata } = paperData;
      const isLoading = paperData?.status === "loading";

      const navigate = () => {
        if (!isLoading) {
          this.routerService.navigate(Pages.ARXIV_DOCUMENT, {
            document_id: metadata.paperId,
          });
        }
      };

      // TODO(vivcodes): Add callback or slot to paper-card for deletion
      const deletePaper = (e: Event) => {
        e.stopPropagation();
        this.historyService.deletePaper(metadata.paperId);
      };

      return html`
        <paper-card
          .metadata=${metadata}
          ?disabled=${isLoading}
          @click=${navigate}
        >
        </paper-card>
      `;
    };

    const historyItems = sortPaperDataByTimestamp(
      this.historyService.getPaperHistory()
    );

    return html`
      ${this.renderLinkInput()}
      <div class="preview-gallery">
        ${historyItems.map((item) => {
          return renderHistoryItem(item);
        })}
        ${this.renderEmptyMessage(historyItems)}
      </div>
    `;
  }

  private renderLinkInput() {
    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    return html`
      <div class="paper-input">
        <pr-textarea
          ?disabled=${this.isLoadingDocument}
          ?focused=${autoFocus}
          size="large"
          .value=${this.paperInput}
          .maxLength=${MAX_IMPORT_URL_LENGTH}
          @change=${(e: CustomEvent) => {
            this.paperInput = e.detail.value;
          }}
          @keydown=${(e: CustomEvent) => {
            if (e.detail.key === "Enter") {
              this.loadDocument();
            }
          }}
          placeholder="Paste your arXiv paper link here"
        ></pr-textarea>
        <pr-icon-button
          icon="arrow_forward"
          variant="tonal"
          @click=${this.loadDocument}
          .loading=${this.isLoadingDocument}
          ?disabled=${this.isLoadingDocument || !this.paperInput}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderEmptyMessage(documents: unknown[]) {
    if (documents.length > 0 || this.isLoadingDocument) return nothing;
    return html`<div class="empty-message">No reading history yet</div>`;
  }
}

/** Paper preview card */
@customElement("paper-card")
export class PaperCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() metadata: ArxivMetadata | null = null;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) summaryMaxCharacters = 250;

  override render() {
    if (!this.metadata) {
      return nothing;
    }

    const classes = { "preview-item": true, disabled: this.disabled };

    // If summary is over max characters, abbreviate
    const summary = this.metadata.summary.length <= this.summaryMaxCharacters ?
      this.metadata.summary :
      `${this.metadata.summary.slice(0, this.summaryMaxCharacters)}...`;

    return html`
      <div class=${classMap(classes)}>
        <div class="preview-image"></div>
        <div class="preview-content">
          <div class="preview-title">${this.metadata.title}</div>
          <div class="preview-description">${summary}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-gallery": HomeGallery;
    "paper-card": PaperCard;
  }
}
