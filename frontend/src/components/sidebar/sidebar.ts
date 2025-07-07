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
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import "../lumi_concept/lumi_concept";
import "../lumi_questions/lumi_questions";
import { styles } from "./sidebar.scss";

import { DocumentStateService } from "../../services/document_state.service";
import { core } from "../../core/core";
import { SelectionInfo } from "../../shared/selection_utils";

/**
 * A sidebar component that displays a list of concepts.
 */
@customElement("lumi-sidebar")
export class LumiSidebar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);

  @property()
  onTextSelection: (selectionInfo: SelectionInfo) => void = () => {};

  override render() {
    const classes = {
      "history-view-active": this.documentStateService.isHistoryShowAll,
      "lumi-questions-container": true,
    };

    const lumiQuestionsHtml = html`
      <div class=${classMap(classes)}>
        <lumi-questions
          .onTextSelection=${this.onTextSelection}
          .isHistoryShowAll=${this.documentStateService.isHistoryShowAll}
          .setHistoryVisible=${(isVisible: boolean) =>
            this.documentStateService.setHistoryShowAll(isVisible)}
        ></lumi-questions>
      </div>
    `;

    if (this.documentStateService.isHistoryShowAll) {
      return html` ${lumiQuestionsHtml} `;
    }

    return html`
      ${lumiQuestionsHtml}
      <div class="divider"></div>
      <div class="lumi-concepts-container">
        <h2 class="heading">Concepts</h2>
        ${this.documentStateService.lumiDocManager?.lumiDoc.concepts.map(
          (concept) =>
            html`<lumi-concept
              .concept=${concept}
              .labelsToShow=${["description"]}
              .onTextSelection=${this.onTextSelection}
            ></lumi-concept>`
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-sidebar": LumiSidebar;
  }
}
