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

import "@material/web/dialog/dialog";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { makeObservable, observable, computed, action } from "mobx";
import "../lumi_concept/lumi_concept";
import "../lumi_questions/lumi_questions";
import "../tab_component/tab_component";
import "../table_of_contents/table_of_contents";
import "./sidebar_header";
import "../history_view/history_view";
import { styles } from "./sidebar.scss";

import { DocumentStateService } from "../../services/document_state.service";
import { core } from "../../core/core";
import { SelectionInfo } from "../../shared/selection_utils";
import { consume } from "@lit/context";
import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import { MdDialog } from "@material/web/dialog/dialog";
import { HistoryService } from "../../services/history.service";
import {
  AnalyticsAction,
  AnalyticsService,
} from "../../services/analytics.service";

const MOBILE_TABS = {
  ANSWERS: "Ask Lumi",
  CONCEPTS: "Concepts",
  TOC: "Table of Contents",
};

const TABS = {
  CONCEPTS: "Concepts",
  TOC: "Table of Contents",
};

const DEFAULT_CONCEPT_IS_COLLAPSED = true;

/**
 * A sidebar component that displays a list of concepts.
 */
@customElement("lumi-sidebar")
export class LumiSidebar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly historyService = core.getService(HistoryService);
  private readonly analyticsService = core.getService(AnalyticsService);

  @query("md-dialog") private readonly dialog!: MdDialog;
  @query(".tabs-container.mobile")
  private readonly tabsContainer!: HTMLDivElement;

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;
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
    this.analyticsService.trackAction(AnalyticsAction.SIDEBAR_TOGGLE_CONCEPT);
    this.conceptCollapsedState.set(conceptName, isCollapsed);
  }

  @action
  private toggleAllConcepts() {
    this.analyticsService.trackAction(
      AnalyticsAction.SIDEBAR_TOGGLE_ALL_CONCEPTS
    );
    const areAnyCollapsed = this.areAnyConceptsCollapsed;
    const newCollapseState = areAnyCollapsed ? false : true;
    this.setAllConceptCollapsed(newCollapseState);
  }

  @property()
  onTextSelection: (selectionInfo: SelectionInfo) => void = () => {};

  private openHistoryDialog() {
    this.dialog.show();
  }

  private renderHeader() {
    return html`<sidebar-header
        .onHistoryClick=${() => {
          this.openHistoryDialog();
        }}
      ></sidebar-header>
      <div class="divider"></div>`;
  }

  private renderHistoryDialog() {
    return html`
      <md-dialog>
        <div slot="headline">History</div>
        <div slot="content">
          <p class="dialog-explanation">
            This is the list of papers and queries included as context for the
            model:
          </p>
          <history-view></history-view>
        </div>
        <div slot="actions">
          <pr-button @click=${() => this.dialog.close()}> Close </pr-button>
        </div>
      </md-dialog>
    `;
  }

  private renderQuestions() {
    const classes = {
      "history-view-active": this.documentStateService.isHistoryShowAll,
      "lumi-questions-container": true,
    };

    return html`
      <div class=${classMap(classes)} slot=${MOBILE_TABS.ANSWERS}>
        <lumi-questions
          .onTextSelection=${this.onTextSelection}
          .isHistoryShowAll=${this.documentStateService.isHistoryShowAll}
          .setHistoryVisible=${(isVisible: boolean) =>
            this.documentStateService.setHistoryShowAll(isVisible)}
        ></lumi-questions>
      </div>
    `;
  }

  private renderConcepts() {
    const concepts =
      this.documentStateService.lumiDocManager?.lumiDoc.concepts || [];

    const toggleAllIcon = this.areAnyConceptsCollapsed
      ? "unfold_less"
      : "unfold_more";

    return html`
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
  }

  private renderToc() {
    return html`
      <div class="toc-container" slot=${TABS.TOC}>
        <table-of-contents
          .sections=${this.documentStateService.lumiDocManager?.lumiDoc
            .sections}
          .onSectionClicked=${(sectionId: string) => {
            this.analyticsService.trackAction(
              AnalyticsAction.SIDEBAR_TOC_SECTION_CLICK
            );
            this.scrollContext?.scrollToSection(sectionId);
          }}
        ></table-of-contents>
      </div>
    `;
  }

  private renderContentsDesktop() {
    if (this.documentStateService.isHistoryShowAll) {
      return html` <div class="contents-desktop">
        ${this.renderQuestions()}
      </div>`;
    }

    return html`
      <div class="contents-desktop">
        ${this.renderHeader()} ${this.renderQuestions()}
        <div class="divider"></div>
        <div class="tabs-container">
          <tab-component
            .tabs=${Object.values(TABS)}
            @tab-selected=${() => {
              this.analyticsService.trackAction(
                AnalyticsAction.SIDEBAR_TAB_CHANGE
              );
            }}
          >
            ${this.renderConcepts()} ${this.renderToc()}
          </tab-component>
        </div>
        ${this.renderHistoryDialog()}
      </div>
    `;
  }

  private renderMobileCollapseButton() {
    const icon = this.documentStateService.isMobileSidebarCollapsed
      ? "keyboard_arrow_down"
      : "keyboard_arrow_up";
    return html`
      <div
        class="mobile-collapse-button"
        @click=${() => {
          this.tabsContainer.scrollTop = 0;
          this.documentStateService.toggleMobileSidebarCollapsed();
        }}
      >
        <pr-icon icon=${icon}></pr-icon>
      </div>
    `;
  }

  private renderMobileTabContents() {
    if (this.documentStateService.isMobileSidebarCollapsed) return nothing;

    return html`
      ${this.renderQuestions()} ${this.renderConcepts()} ${this.renderToc()}
    `;
  }

  private renderContentsMobile() {
    if (this.documentStateService.isHistoryShowAll) {
      return html`<div class="contents-mobile">${this.renderQuestions()}</div>`;
    }

    const tabsContainerClasses = classMap({
      ["tabs-container"]: true,
      ["mobile"]: true,
      ["is-mobile-sidebar-collapsed"]:
        this.documentStateService.isMobileSidebarCollapsed,
    });

    return html`
      <div class="contents-mobile">
        ${this.renderHeader()}
        <div class=${tabsContainerClasses}>
          <tab-component
            @tab-selected=${() => {
              this.analyticsService.trackAction(
                AnalyticsAction.SIDEBAR_TAB_CHANGE
              );
              if (this.documentStateService.isMobileSidebarCollapsed) {
                this.documentStateService.toggleMobileSidebarCollapsed();
              }
            }}
            .tabs=${Object.values(MOBILE_TABS)}
          >
            ${this.renderMobileTabContents()}
          </tab-component>
        </div>
        ${this.renderMobileCollapseButton()} ${this.renderHistoryDialog()}
      </div>
    `;
  }

  override render() {
    return html`
      ${this.renderContentsDesktop()} ${this.renderContentsMobile()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-sidebar": LumiSidebar;
  }
}
