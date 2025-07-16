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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";
import { HistoryService } from "../../services/history.service";
import { core } from "../../core/core";
import { PaperData } from "../../shared/types_local_storage";
import { styles } from "./history_view.scss";

/**
 * A component that displays the paper history.
 */
@customElement("history-view")
export class HistoryView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly historyService = core.getService(HistoryService);

  private papers: PaperData[] = [];

  override connectedCallback() {
    super.connectedCallback();
    this.papers = this.historyService.getPaperHistory();
  }

  private renderHistoryItems() {
    return html`
      <ul class="history-items">
        ${this.historyService
          .getAnswers(this.papers[0].metadata.paperId)
          .map(
            (answer) => html`
              <li class="history-item">
                ${answer.request.query || answer.request.highlight}
              </li>
            `
          )}
      </ul>
    `;
  }

  override render() {
    return html`
      <ul class="papers">
        ${this.papers.concat(this.papers).map(
          (paper) => html`
            <li class="paper">
              <div class="title">${paper.metadata.title}</div>
              <div class="authors">${paper.metadata.authors.join(", ")}</div>
              ${this.renderHistoryItems()}
            </li>
          `
        )}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "history-view": HistoryView;
  }
}
