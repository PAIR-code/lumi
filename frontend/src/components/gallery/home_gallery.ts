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

import '../../pair-components/textarea';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../lumi_image/lumi_image';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { core } from '../../core/core';
import { HomeService } from '../../services/home.service';
import { HistoryService } from '../../services/history.service';
import {
  Pages,
  RouterService,
  getLumiPaperUrl,
} from '../../services/router.service';
import { ApiService } from '../../services/api.service';
import { SnackbarService } from '../../services/snackbar.service';

import {
  LumiDoc,
  LoadingStatus,
  ArxivMetadata,
  LOADING_STATUS_ERROR_STATES,
  FeaturedImage,
} from '../../shared/lumi_doc';
import { ArxivCollection } from '../../shared/lumi_collection';
import {
  requestArxivDocImportCallable,
  RequestArxivDocImportResult,
} from '../../shared/api_callables';
import { extractArxivId } from '../../shared/string_utils';

import { styles } from './home_gallery.scss';
import { makeObservable, observable, ObservableMap, toJS } from 'mobx';
import { PaperData } from '../../shared/types_local_storage';
import { MAX_IMPORT_URL_LENGTH } from '../../shared/constants';
import { GalleryView } from '../../shared/types';
import { ifDefined } from 'lit/directives/if-defined.js';
import { DialogService, TOSDialogProps } from '../../services/dialog.service';
import { SettingsService } from '../../services/settings.service';

function getStatusDisplayText(status: LoadingStatus) {
  switch (status) {
    case LoadingStatus.WAITING:
      return 'Loading';
    case LoadingStatus.SUMMARIZING:
      return 'Summarizing';
    default:
      return '';
  }
}

/** Gallery for home/landing page */
@customElement('home-gallery')
export class HomeGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);
  private readonly apiService = core.getService(ApiService);
  private readonly historyService = core.getService(HistoryService);
  private readonly snackbarService = core.getService(SnackbarService);
  private readonly settingsService = core.getService(SettingsService);

  @property() galleryView: GalleryView = GalleryView.LOCAL;

  // Paper URL or ID for text input box
  @state() private paperInput: string = '';
  // Whether the last imported paper is still loading metadata
  // (if true, this blocks importing another paper)
  @state() private isLoadingMetadata = false;

  @observable.shallow private websockets = new ObservableMap<
    string,
    WebSocket
  >();
  private loadingStatusMap = new ObservableMap<string, LoadingStatus>();

  constructor() {
    super();
    makeObservable(this);
  }

  get isLoadingDocument(): boolean {
    return this.websockets.size > 0 || this.isLoadingMetadata;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.historyService.paperMetadata.forEach((metadata, paperId) => {
      const paperData = this.historyService.getPaperData(paperId);
      if (paperData && paperData.status === 'loading') {
        this.listenForDocReady(paperId, metadata);
      }
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.websockets.forEach((ws) => ws.close());
    this.websockets.clear();
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    if (!this.settingsService.isTosConfirmed.value) {
      this.dialogService.show(
        new TOSDialogProps(() => {
          this.dialogService.hide(new TOSDialogProps(() => {}));
        })
      );
    }
  }

  private async requestDocument(id: string) {
    const response = await requestArxivDocImportCallable(this.apiService, id);
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
    if (foundPaper && foundPaper.status === 'complete') {
      this.snackbarService.show('Paper already loaded.');
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
    this.paperInput = '';

    const metadata = response.metadata;
    if (!metadata || !metadata.version) {
      this.snackbarService.show('Error: Document not found.');
      return;
    }

    // This will add the paper to local storage with 'loading' status
    // and update the reactive `paperMetadata` map in historyService.
    this.historyService.addLoadingPaper(paperId, metadata);
    this.listenForDocReady(paperId, metadata);
  }

  private listenForDocReady(paperId: string, metadata: ArxivMetadata) {
    // If there's an existing WebSocket for this paper, close it first.
    if (this.websockets.has(paperId)) {
      this.websockets.get(paperId)?.close();
    }

    // Connect to WebSocket for real-time updates
    const ws = this.apiService.connectDocumentSocket(
      paperId,
      metadata.version,
      (data) => {
        // Handle WebSocket updates
        const loadingStatus = data.loading_status || data.loadingStatus;
        const loadingError = data.loading_error || data.loadingError;

        console.log(`[HomeGallery] WebSocket update for ${paperId}:`, {
          data,
          loadingStatus,
          loadingError,
          paperId: metadata.paperId,
          hasMetadataPaperId: !!metadata.paperId,
          currentStatusInMap: this.loadingStatusMap.get(metadata.paperId),
        });

        if (metadata.paperId) {
          this.loadingStatusMap.set(
            metadata.paperId,
            loadingStatus as LoadingStatus
          );
          console.log(
            `[HomeGallery] Updated loadingStatusMap for ${metadata.paperId} to ${loadingStatus}`
          );
        } else {
          console.warn(
            `[HomeGallery] metadata.paperId is undefined, cannot update status`
          );
        }

        // Once the document has loaded successfully, update its status
        // to 'complete' and close WebSocket.
        if (loadingStatus === LoadingStatus.SUCCESS) {
          console.log(
            `[HomeGallery] Document loaded successfully for ${paperId}`
          );
          this.historyService.addPaper(paperId, metadata);
          // Also update paper image (now that it's available in metadata)
          this.homeService.loadMetadata([paperId], true);

          this.websockets.get(paperId)?.close();
          this.websockets.delete(paperId);
          this.snackbarService.show('Document loaded.');
        } else if (
          LOADING_STATUS_ERROR_STATES.includes(
            loadingStatus as LoadingStatus
          ) ||
          loadingStatus === LoadingStatus.TIMEOUT
        ) {
          console.log(
            `[HomeGallery] Document loading failed for ${paperId}: ${loadingError}`
          );
          this.historyService.deletePaper(paperId);
          this.websockets.get(paperId)?.close();
          this.websockets.delete(paperId);
          this.snackbarService.show(`${loadingError}`);
        } else {
          console.log(
            `[HomeGallery] Document still loading for ${paperId}: ${loadingStatus}`
          );
        }
      },
      (error) => {
        console.error('[HomeGallery] WebSocket error:', error);
        this.websockets.delete(paperId);
      }
    );

    this.websockets.set(paperId, ws);
  }

  override render() {
    return html`${this.renderContent()}${this.renderDialog()}`;
  }

  private renderContent() {
    const historyItems = this.historyService
      .getPaperHistory()
      .map((item) => item.metadata);

    switch (this.galleryView) {
      case GalleryView.CURRENT:
        const currentPapers = this.homeService.currentMetadata ?? [];
        return html`
          ${this.renderCollectionMenu()} ${this.renderCollection(currentPapers)}
        `;
      case GalleryView.LOCAL:
        return html`
          ${this.renderCollectionMenu()}
          ${this.renderLoadingMessages(historyItems)}
          ${this.renderCollection(historyItems)}
        `;
      default:
        return nothing;
    }
  }

  // TODO: Move document loading logic to MobXService and move this dialog
  // to app.ts
  private renderDialog() {
    if (!this.homeService.showUploadDialog) {
      return nothing;
    }

    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    const close = () => {
      this.homeService.setShowUploadDialog(false);
    };

    const submit = () => {
      this.routerService.navigate(Pages.HOME);
      this.loadDocument();
      close();
    };

    return html`
      <pr-dialog
        .showDialog=${this.homeService.showUploadDialog}
        .onClose=${close}
        showCloseButton
        enableEscape
      >
        <div slot="title">Import paper</div>
        <div class="dialog-content">
          <div class="paper-input">
            <pr-textarea
              ?disabled=${this.isLoadingMetadata}
              ?focused=${autoFocus}
              size="medium"
              .value=${this.paperInput}
              .maxLength=${MAX_IMPORT_URL_LENGTH}
              @change=${(e: CustomEvent) => {
                this.paperInput = e.detail.value;
              }}
              @keydown=${(e: CustomEvent) => {
                if (e.detail.key === 'Enter') {
                  submit();
                }
              }}
              placeholder="Paste your arXiv paper link here"
            ></pr-textarea>
            <pr-icon-button
              icon="arrow_forward"
              variant="tonal"
              @click=${submit}
              .loading=${this.isLoadingMetadata}
              ?disabled=${this.isLoadingMetadata || !this.paperInput}
            >
            </pr-icon-button>
          </div>
        </div>
      </pr-dialog>
    `;
  }

  private renderLoadingMessages(metadata: ArxivMetadata[]) {
    const loadingItems = metadata.filter((item) =>
      this.websockets.get(item.paperId)
    );

    const renderNewLoading = () => {
      return html`
        <div class="loading-message"><i>Loading new paper...</i></div>
      `;
    };

    if (loadingItems.length > 0) {
      return html`
        <div class="loading-section">
          ${this.isLoadingMetadata ? renderNewLoading() : nothing}
          ${loadingItems.map(
            (item) => html`
              <div class="loading-message">
                Loading <i>${item.title} (${item.paperId})</i>
              </div>
            `
          )}
        </div>
      `;
    } else if (this.isLoadingMetadata) {
      return html` <div class="loading-section">${renderNewLoading()}</div> `;
    }
    return nothing;
  }

  private renderCollectionMenu() {
    const collections = this.homeService.collections;
    return html`
      <div class="nav-menu">
        ${this.renderLocalCollectionNavItem()}
        ${collections.map((collection) =>
          this.renderCollectionNavItem(collection)
        )}
      </div>
    `;
  }

  private renderLocalCollectionNavItem() {
    const classes = classMap({
      'nav-item': true,
      active: this.routerService.activePage === Pages.HOME,
    });

    const navigate = () => {
      this.routerService.navigate(Pages.HOME);
    };

    return html`
      <div class=${classes} role="button" @click=${navigate}>
        <pr-icon icon="bookmarks" size="small"></pr-icon>
        <span>My collection</span>
      </div>
    `;
  }

  private renderCollectionNavItem(collection: ArxivCollection) {
    const isCurrent =
      collection.collectionId === this.homeService.currentCollectionId;
    const classes = classMap({
      'nav-item': true,
      active: isCurrent && this.routerService.activePage === Pages.COLLECTION,
    });

    const navigate = () => {
      this.routerService.navigate(Pages.COLLECTION, {
        collection_id: collection.collectionId,
      });
    };

    return html`
      <div class=${classes} role="button" @click=${navigate}>
        <span>${collection.title}</span>
      </div>
    `;
  }

  private getImageUrl() {
    return (path: string) => this.apiService.getDownloadUrl(path);
  }

  private renderCollection(items: ArxivMetadata[]) {
    const renderItem = (metadata: ArxivMetadata) => {
      if (!metadata) {
        return nothing;
      }

      const image = this.homeService.paperToFeaturedImageMap.get(
        metadata.paperId
      );
      const status = this.loadingStatusMap.get(metadata.paperId);
      const statusText = status ? getStatusDisplayText(status) : '';

      console.log(`[HomeGallery] Rendering card for ${metadata.paperId}:`, {
        status,
        statusText,
        hasImage: !!image,
        title: metadata.title,
      });

      return html`
        <a
          href=${getLumiPaperUrl(metadata.paperId)}
          class="paper-card-link"
          rel="noopener noreferrer"
        >
          <paper-card
            .status=${statusText}
            .metadata=${metadata}
            .image=${ifDefined(image)}
            .getImageUrl=${this.getImageUrl()}
          >
          </paper-card>
        </a>
      `;
    };
    const renderEmpty = () => {
      return html` <div class="empty-message">No papers available</div> `;
    };

    return html`
      ${items.length === 0 ? renderEmpty() : nothing}
      <div class="preview-gallery">
        ${items.map((item) => renderItem(item))}
      </div>
    `;
  }
}

/** Paper preview card */
@customElement('paper-card')
export class PaperCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) metadata: ArxivMetadata | null = null;
  @property({ type: Object }) image: FeaturedImage | null = null;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) summaryMaxCharacters = 250;
  @property({ type: String }) status = '';
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;

  private renderImage() {
    if (
      this.image == null ||
      this.getImageUrl == null ||
      !this.image.imageStoragePath
    ) {
      return html`<div class="preview-image preview-image-gradient"></div>`;
    }
    return html`<lumi-image
      class="preview-image"
      .storagePath=${this.image.imageStoragePath}
      .getImageUrl=${this.getImageUrl}
    ></lumi-image>`;
  }

  override render() {
    // TODO: Render loading state for paper card if no metadata
    if (!this.metadata) {
      return nothing;
    }

    const classes = { 'preview-item': true, disabled: this.disabled };

    // If summary is over max characters, abbreviate
    const summary =
      this.metadata.summary.length <= this.summaryMaxCharacters
        ? this.metadata.summary
        : `${this.metadata.summary.slice(0, this.summaryMaxCharacters)}...`;

    const authors = this.metadata.authors.join(', ');
    return html`
      <div class=${classMap(classes)}>
        ${this.renderImage()}
        <div class="preview-content">
          <div class="preview-title">${this.metadata.title}</div>
          <div class="preview-metadata">
            <div class="preview-authors" .title=${authors}>${authors}</div>
            <div class="preview-id">(${this.metadata.paperId})</div>
          </div>
          ${this.renderStatusChip()}
          <div class="preview-description">${summary}</div>
        </div>
      </div>
    `;
  }

  private renderStatusChip() {
    if (!this.status) {
      return nothing;
    }
    return html`<div class="chip secondary">${this.status}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-gallery': HomeGallery;
    'paper-card': PaperCard;
  }
}
