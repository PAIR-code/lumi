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

import "./gallery_card";
import "../../pair-components/textarea";
import "../../pair-components/icon_button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Unsubscribe, doc, onSnapshot } from "firebase/firestore";

import { core } from "../../core/core";
import { HomeService } from "../../services/home.service";
import { HistoryService } from "../../services/history.service";
import { Pages, RouterService } from "../../services/router.service";
import { FirebaseService } from "../../services/firebase.service";
import { SnackbarService } from "../../services/snackbar.service";

import { LumiDoc, LoadingStatus, ArxivMetadata } from "../../shared/lumi_doc";
import { GalleryItem } from "../../shared/types";
import { requestArxivDocImportCallable } from "../../shared/callables";

import { styles } from "./home_gallery.scss";
import { makeObservable, observable, ObservableMap } from "mobx";
import { PaperData } from "../../shared/types_local_storage";
import { sortPaperDataByTimestamp } from "../../shared/lumi_paper_utils";

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

  // TODO(ellenj): Implement error handling.
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
    const paperId = this.paperInput.split('/').pop();
    if (!paperId) {
      // Paper ID is only empty if input was empty
      this.snackbarService.show(`Error: No URL to parse`);
      return;
    }

    this.isLoadingMetadata = true;
    let metadata: ArxivMetadata;

    const existingPapers = this.historyService.getPaperHistory();
    const foundPaper = existingPapers.find(
      (paper) => paper.metadata.paperId === paperId
    );
    if (foundPaper && foundPaper.status === "complete") {
      this.snackbarService.show("Paper already loaded.");
    }

    this.snackbarService.show(
      "Starting import - this may take several minutes..."
    );

    try {
      metadata = await this.requestDocument(paperId);
    } catch (error) {
      this.snackbarService.show("Error: Document not found.");
      return;
    } finally {
      this.isLoadingMetadata = false;
    }

    // Reset paper input
    this.paperInput = "";

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
            this.snackbarService.show("Error loading document.");
          }
        }
      }
    );
    this.unsubscribeListeners.set(paperId, unsubscribe);
  }

  override render() {
    const renderDocument = (document: LumiDoc) => {
      const item: GalleryItem = {
        title: document.metadata?.title ?? "Untitled Paper",
        description: document.metadata?.summary ?? "",
        creator: document.metadata?.authors.join(", ") ?? "Unknown Author",
        date: document.metadata?.publishedTimestamp ?? "",
        version: document.metadata?.version ?? "",
        isPublic: true,
        isStarred: false,
        tags: [],
      };

      const navigate = () => {
        if (document.metadata) {
          this.routerService.navigate(Pages.ARXIV_DOCUMENT, {
            document_id: document.metadata.paperId,
          });
        }
      };

      return html`
        <gallery-card .item=${item} @click=${navigate}></gallery-card>
      `;
    };

    const renderHistoryItem = (paperData: PaperData) => {
      const { metadata } = paperData;
      const isLoading = paperData?.status === "loading";

      const item: GalleryItem = {
        title: metadata.title,
        description: metadata.summary,
        creator: metadata.authors.join(", "),
        date: metadata.publishedTimestamp,
        version: metadata.version,
        isPublic: true,
        isStarred: false,
        tags: [],
      };

      const navigate = () => {
        if (!isLoading) {
          this.routerService.navigate(Pages.ARXIV_DOCUMENT, {
            document_id: metadata.paperId,
          });
        }
      };

      // TODO(ellenj): Update gallery card to take in a callback or slot to delete the paper.
      const deletePaper = (e: Event) => {
        e.stopPropagation();
        this.historyService.deletePaper(metadata.paperId);
      };

      return html`
        <gallery-card .item=${item} ?disabled=${isLoading} @click=${navigate}>
          <md-icon-button slot="actions" @click=${deletePaper}>
            <md-icon>delete</md-icon>
          </md-icon-button>
        </gallery-card>
      `;
    };

    const historyItems = sortPaperDataByTimestamp(
      this.historyService.getPaperHistory()
    );

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
          .onChange=${(e: Event) =>
            (this.paperInput = (e.target as HTMLInputElement).value)}
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
      <div class="gallery-wrapper">
        ${historyItems.map((item) => {
          return renderHistoryItem(item);
        })}
        ${this.renderEmptyMessage(historyItems)}
      </div>
      <div class="history-controls">
        <pr-button
          @click=${() => this.historyService.clearAllHistory()}
          ?disabled=${historyItems.length === 0}
          variant="tonal"
        >
          Clear history
        </pr-button>
      </div>
    `;
  }

  private renderEmptyMessage(documents: unknown[]) {
    if (documents.length > 0 || this.isLoadingDocument) return nothing;
    return html`<div class="empty-message">No reading history yet</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-gallery": HomeGallery;
  }
}
