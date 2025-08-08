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
import { customElement, property, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { computed, makeObservable } from "mobx";
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
import { HistoryService } from "../../services/history.service";
import {
  AnalyticsAction,
  AnalyticsService,
} from "../../services/analytics.service";
import {
  DialogService,
  HistoryDialogProps,
} from "../../services/dialog.service";
import { SIDEBAR_TABS, SIDEBAR_TABS_MOBILE } from "../../shared/constants";
import { FloatingPanelService } from "../../services/floating_panel_service";

/**
 * A sidebar component that displays a list of concepts.
 */
@customElement("lumi-sidebar")
export class LumiSidebar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly dialogService = core.getService(DialogService);
  private readonly collapseManager = this.documentStateService.collapseManager;

  @query(".tabs-container.mobile")
  private readonly tabsContainer!: HTMLDivElement;

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  @computed get areAnyConceptsCollapsed() {
    if (!this.collapseManager) return true;
    return (
      this.documentStateService.lumiDocManager?.lumiDoc.concepts.some(
        (concept) =>
          this.collapseManager!.conceptCollapsedState.get(concept.name) ?? true
      ) ?? true
    );
  }

  constructor() {
    super();
    makeObservable(this);
  }

  private openHistoryDialog() {
    this.dialogService.show(new HistoryDialogProps());
  }

  private registerShadowRoot(shadowRoot: ShadowRoot) {
    this.floatingPanelService.registerShadowRoot(shadowRoot);
  }

  private unregisterShadowRoot(shadowRoot: ShadowRoot) {
    this.floatingPanelService.unregisterShadowRoot(shadowRoot);
  }

  private renderHeader() {
    return html`<sidebar-header
        .onHistoryClick=${() => {
          this.openHistoryDialog();
        }}
      ></sidebar-header>
      <div class="divider"></div>`;
  }

  private renderQuestions() {
    const classes = {
      "history-view-active": this.documentStateService.isHistoryShowAll,
      "lumi-questions-container": true,
    };

    return html`
      <div class=${classMap(classes)} slot=${SIDEBAR_TABS_MOBILE.ANSWERS}>
        <lumi-questions
          .isHistoryShowAll=${this.documentStateService.isHistoryShowAll}
          .setHistoryVisible=${(isVisible: boolean) =>
            this.documentStateService.setHistoryShowAll(isVisible)}
        ></lumi-questions>
      </div>
    `;
  }

  private renderConcepts() {
    if (!this.collapseManager) return nothing;

    const concepts =
      this.documentStateService.lumiDocManager?.lumiDoc.concepts || [];

    const toggleAllIcon = this.areAnyConceptsCollapsed
      ? "unfold_more"
      : "unfold_less";

    return html`
      <div class="concepts-container" slot=${SIDEBAR_TABS.CONCEPTS}>
        <div class="header">
          <div class="heading">Concepts (${concepts.length + 1})</div>
          <pr-icon-button
            variant="default"
            .icon=${toggleAllIcon}
            @click=${() => {
              this.analyticsService.trackAction(
                AnalyticsAction.SIDEBAR_TOGGLE_ALL_CONCEPTS
              );
              this.collapseManager?.toggleAllConcepts();
            }}
          ></pr-icon-button>
        </div>
        <div class="concepts-list">
          ${concepts.map(
            (concept) =>
              html`<lumi-concept
                .concept=${concept}
                .labelsToShow=${["description"]}
                .registerShadowRoot=${this.registerShadowRoot.bind(this)}
                .unregisterShadowRoot=${this.unregisterShadowRoot.bind(this)}
                .isCollapsed=${this.collapseManager!.conceptCollapsedState.get(
                  concept.name
                ) ?? true}
                .setIsCollapsed=${(isCollapsed: boolean) => {
                  this.analyticsService.trackAction(
                    AnalyticsAction.SIDEBAR_TOGGLE_CONCEPT
                  );
                  this.collapseManager?.setConceptCollapsed(
                    concept.name,
                    isCollapsed
                  );
                }}
              ></lumi-concept>`
          )}
        </div>
      </div>
    `;
  }

  private renderToc() {
    return html`
      <div class="toc-container" slot=${SIDEBAR_TABS.TOC}>
        <table-of-contents
          .sections=${this.documentStateService.lumiDocManager?.lumiDoc
            .sections}
          .lumiSummariesMap=${this.documentStateService.lumiDocManager
            ?.summaryMaps}
          .onSectionClicked=${(sectionId: string) => {
            if (!this.documentStateService.collapseManager) return;

            this.analyticsService.trackAction(
              AnalyticsAction.SIDEBAR_TOC_SECTION_CLICK
            );
            this.documentStateService.collapseManager.expandToSection(
              sectionId
            );

            setTimeout(() => {
              this.scrollContext?.scrollToSection(sectionId);
            }, 0);
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
            .tabs=${Object.values(SIDEBAR_TABS)}
            .selectedTab=${this.collapseManager?.sidebarTabSelection}
            @tab-selected=${(e: CustomEvent) => {
              this.analyticsService.trackAction(
                AnalyticsAction.SIDEBAR_TAB_CHANGE
              );
              this.collapseManager?.setSidebarTabSelection(e.detail.tab);
            }}
          >
            ${this.renderConcepts()} ${this.renderToc()}
          </tab-component>
        </div>
      </div>
    `;
  }

  private renderMobileCollapseButton() {
    const icon = this.collapseManager?.isMobileSidebarCollapsed
      ? "keyboard_arrow_down"
      : "keyboard_arrow_up";
    return html`
      <div
        class="mobile-collapse-button"
        @click=${() => {
          this.tabsContainer.scrollTop = 0;
          this.collapseManager?.toggleMobileSidebarCollapsed();
        }}
      >
        <pr-icon icon=${icon}></pr-icon>
      </div>
    `;
  }

  private renderMobileTabContents() {
    if (this.collapseManager?.isMobileSidebarCollapsed) return nothing;

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
        this.collapseManager?.isMobileSidebarCollapsed ?? true,
    });

    return html`
      <div class="contents-mobile">
        ${this.renderHeader()}
        <div class=${tabsContainerClasses}>
          <tab-component
            .tabs=${Object.values(SIDEBAR_TABS_MOBILE)}
            .selectedTab=${this.collapseManager?.sidebarTabSelection}
            @tab-selected=${(e: CustomEvent) => {
              this.analyticsService.trackAction(
                AnalyticsAction.SIDEBAR_TAB_CHANGE
              );
              this.collapseManager?.setSidebarTabSelection(e.detail.tab);
              if (this.collapseManager?.isMobileSidebarCollapsed) {
                this.collapseManager?.toggleMobileSidebarCollapsed();
              }
            }}
          >
            ${this.renderMobileTabContents()}
          </tab-component>
        </div>
        ${this.renderMobileCollapseButton()}
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
