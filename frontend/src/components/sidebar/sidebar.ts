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
import { CSSResultGroup, html, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { makeObservable, observable, computed, action } from "mobx";
import "../lumi_concept/lumi_concept";
import "../lumi_questions/lumi_questions";
import "../tab_component/tab_component";
import "../table_of_contents/table_of_contents";
import { styles } from "./sidebar.scss";

import { DocumentStateService } from "../../services/document_state.service";
import { core } from "../../core/core";
import { SelectionInfo } from "../../shared/selection_utils";

const TABS = {
  TOC: "Table of Contents",
  CONCEPTS: "Concepts",
};

const DEFAULT_CONCEPT_IS_COLLAPSED = true;

/**
 * A sidebar component that displays a list of concepts.
 */
@customElement("lumi-sidebar")
export class LumiSidebar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);

  @observable private conceptCollapsedState = new Map<string, boolean>();

  @computed get areAnyConceptsCollapsed() {
    return (
      this.documentStateService.lumiDocManager?.lumiDoc.concepts.some(
        (concept) =>
          this.conceptCollapsedState.get(concept.name) ??
          DEFAULT_CONCEPT_IS_COLLAPSED
      ) ?? DEFAULT_CONCEPT_IS_COLLAPSED
    );
  }

  constructor() {
    super();
    makeObservable(this);
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    this.setAllConceptCollapsed(DEFAULT_CONCEPT_IS_COLLAPSED);
  }

  @action
  private setAllConceptCollapsed(isCollapsed: boolean) {
    this.documentStateService.lumiDocManager?.lumiDoc.concepts.forEach(
      (concept) => {
        this.conceptCollapsedState.set(concept.name, isCollapsed);
      }
    );
  }

  @action
  private setConceptCollapsed(conceptName: string, isCollapsed: boolean) {
    this.conceptCollapsedState.set(conceptName, isCollapsed);
  }

  @action
  private toggleAllConcepts() {
    const areAnyCollapsed = this.areAnyConceptsCollapsed;
    const newCollapseState = areAnyCollapsed ? false : true;
    this.setAllConceptCollapsed(newCollapseState);
  }

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

    const toggleAllIcon = this.areAnyConceptsCollapsed
      ? "unfold_less"
      : "unfold_more";

    const concepts =
      this.documentStateService.lumiDocManager?.lumiDoc.concepts || [];

    const conceptsHtml = html`
      <div class="concepts-container" slot=${TABS.CONCEPTS}>
        <div class="header">
          <div class="heading">Concepts (${concepts.length + 1})</div>
          <pr-icon-button
            variant="default"
            .icon=${toggleAllIcon}
            @click=${this.toggleAllConcepts}
          ></pr-icon-button>
        </div>
        <div class="concepts-list">
          ${concepts.map(
            (concept) =>
              html`<lumi-concept
                .concept=${concept}
                .labelsToShow=${["description"]}
                .onTextSelection=${this.onTextSelection}
                .isCollapsed=${this.conceptCollapsedState.get(concept.name) ??
                true}
                .setIsCollapsed=${(isCollapsed: boolean) => {
                  this.setConceptCollapsed(concept.name, isCollapsed);
                }}
              ></lumi-concept>`
          )}
        </div>
      </div>
    `;

    const tocHtml = html`
      <table-of-contents slot=${TABS.TOC}></table-of-contents>
    `;

    return html`
      ${lumiQuestionsHtml}
      <div class="divider"></div>
      <div class="lumi-concepts-container">
        <div class="header">
          <tab-component .tabs=${Object.values(TABS)}>
            ${tocHtml} ${conceptsHtml}
          </tab-component>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-sidebar": LumiSidebar;
  }
}
