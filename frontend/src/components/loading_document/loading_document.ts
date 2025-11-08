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

import { LitElement, html, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { getArxivPaperUrl } from '../../services/router.service';
import { ArxivMetadata } from '../../shared/lumi_doc';
import { styles } from './loading_document.scss';

import '../../pair-components/circular_progress';
import '../../pair-components/button';
import '../../pair-components/icon_button';

/**
 * A component to display document metadata while the full document is loading.
 */
@customElement('loading-document')
export class LoadingDocument extends LitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) metadata?: ArxivMetadata;
  @property({ type: Object }) onBackClick: () => void = () => {};

  override render() {
    if (!this.metadata) {
      return html``;
    }

    return html`
      <div class="loading-container">
        <div class="loading-content">
          <div class="header">
            <div class="importing-group">
              <pr-circular-progress></pr-circular-progress>
              <span>Importing document...</span>
            </div>
            <span class="note-text">
              This may take a few minutes. Feel free to browse other papers and
              come back to this link.
            </span>
          </div>
          <div class="metadata-content">
            <h1 class="title">
              <span
                >${this.metadata.title}
                <a
                  href=${getArxivPaperUrl(this.metadata.paperId)}
                  class="arxiv-link"
                  rel="noopener noreferrer"
                >
                  <pr-icon-button
                    class="open-button"
                    variant="default"
                    icon="open_in_new"
                    title="Open in arXiv"
                  >
                  </pr-icon-button>
                </a>
              </span>
            </h1>
            <div class="authors">${this.metadata.authors.join(', ')}</div>
            <div class="summary">${this.metadata.summary}</div>
          </div>
          <div class="footer">
            <pr-button variant="tonal" @click=${this.onBackClick.bind(this)}
              >Back to Lumi home</pr-button
            >
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'loading-document': LoadingDocument;
  }
}
