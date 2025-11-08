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

import '../../pair-components/button';
import './tos_content';
import '../../pair-components/textinput';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { core } from '../../core/core';
import { HistoryService } from '../../services/history.service';
import {
  Pages,
  RouterService,
  getLumiPaperUrl,
} from '../../services/router.service';
import { SettingsService } from '../../services/settings.service';

import { ArxivMetadata } from '../../shared/lumi_doc';
import { sortPaperDataByTimestamp } from '../../shared/lumi_paper_utils';
import { ColorMode } from '../../shared/types';

import { styles } from './reading_history.scss';

/** Reading history used for history dialog, settings page */
@customElement('reading-history')
export class ReadingHistory extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly historyService = core.getService(HistoryService);

  @property({ type: Boolean }) showTitle = false;

  renderHistoryItem(item: ArxivMetadata) {
    return html`
      <div class="history-item">
        <div class="left">
          <a
            href=${getLumiPaperUrl(item.paperId)}
            rel="noopener noreferrer"
            class="title"
          >
            ${item.title}
          </a>
          <div>${item.authors.join(', ')}</div>
          <i>${item.paperId}</i>
        </div>
        <div class="right">
          <pr-icon-button
            color="neutral"
            icon="delete"
            variant="default"
            @click=${(e: Event) => {
              e.stopPropagation();
              const isConfirmed = window.confirm(
                `Are you sure you want to remove this paper from your reading history? This will also remove it from "My Collection."`
              );
              if (isConfirmed) {
                this.historyService.deletePaper(item.paperId);
                this.requestUpdate();
              }
            }}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }

  renderClearButton() {
    return html`
      <pr-button
        @click=${() => {
          const isConfirmed = window.confirm(
            `Are you sure you want to clear history? This will remove all items from "My Collection."`
          );
          if (isConfirmed) {
            this.historyService.clearAllHistory();
            this.requestUpdate();
          }
        }}
        color="error"
        variant="tonal"
      >
        Clear entire reading history
      </pr-button>
    `;
  }

  override render() {
    const historyItems = sortPaperDataByTimestamp(
      this.historyService.getPaperHistory()
    ).map((item) => item.metadata);
    const hasItems = historyItems.length > 0;

    return html`
      ${this.showTitle
        ? html`<h2>Reading History (${historyItems.length})</h2>`
        : nothing}
      ${!hasItems ? html`<i>No papers yet</i>` : nothing}
      ${historyItems.map((item) => this.renderHistoryItem(item))}
      ${hasItems ? this.renderClearButton() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-history': ReadingHistory;
  }
}
