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

import "../../pair-components/button";
import "./tos_content";
import "../../pair-components/textinput";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { HistoryService } from "../../services/history.service";
import { getLumiPaperUrl } from "../../services/router.service";
import { SettingsService } from "../../services/settings.service";

import { ArxivMetadata } from "../../shared/lumi_doc";
import { sortPaperDataByTimestamp } from "../../shared/lumi_paper_utils";
import { ColorMode } from "../../shared/types";

import { styles } from "./settings.scss";

/** Settings page component */
@customElement("settings-page")
export class Settings extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly historyService = core.getService(HistoryService);
  private readonly settingsService = core.getService(SettingsService);

  renderHistoryItem(item: ArxivMetadata) {
    return html`
      <div class="history-item">
        <div class="left">
          <a href=${getLumiPaperUrl(item.paperId)}
            rel="noopener noreferrer"
            class="title">
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

  override render() {
    const historyItems = sortPaperDataByTimestamp(
      this.historyService.getPaperHistory()
    ).map((item) => item.metadata);
  const hasItems = historyItems.length > 0;

    return html`
      <div class="settings">
        <div class="section">
          <h2>Reading History (${historyItems.length})</h2>
          ${!hasItems ? html`<i>No papers yet</i>` : nothing}
          ${historyItems.map((item) => this.renderHistoryItem(item))}
          <pr-button
            @click=${() => {
              const isConfirmed = window.confirm(
                `Are you sure you want to clear history? This will remove all items from "My Collection."`
              );
              if (isConfirmed) {
                this.historyService.clearAllHistory();
              }
            }}
            ?disabled=${!hasItems}
            color="error"
            variant="tonal"
          >
            Clear entire reading history
          </pr-button>
        </div>
        <div class="section">
          <h2>Model API Key</h2>
          <div>
            <i>Optional: Use your own Gemini API key for Lumi queries.</i>
          </div>
          <div class="field">
            <pr-textinput
              .value=${this.settingsService.apiKey.value}
              .onChange=${(e: InputEvent) => {
                const value = (e.target as HTMLInputElement).value;
                this.settingsService.apiKey.value = value;
              }}
              placeholder="API key"
            ></pr-textinput>
          </div>
        </div>
        <div class="section">
          <h2>About Lumi</h2>
          <tos-content></tos-content>
        </div>
      </div>
    `;
  }

  private renderColorModeSection() {
    const handleClick = (mode: ColorMode) => {
      this.settingsService.setColorMode(mode);
    };

    const isMode = (mode: ColorMode) => {
      return this.settingsService.colorMode === mode;
    };

    return html`
      <div class="section">
        <h2>Color Mode</h2>
        <div class="action-buttons">
          <pr-button
            color=${isMode(ColorMode.LIGHT) ? "primary" : "neutral"}
            variant=${isMode(ColorMode.LIGHT) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorMode.LIGHT);
            }}
          >
            Light
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DARK) ? "primary" : "neutral"}
            variant=${isMode(ColorMode.DARK) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorMode.DARK);
            }}
          >
            Dark
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DEFAULT) ? "primary" : "neutral"}
            variant=${isMode(ColorMode.DEFAULT) ? "tonal" : "default"}
            @click=${() => {
              handleClick(ColorMode.DEFAULT);
            }}
          >
            System Default
          </pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-page": Settings;
  }
}
