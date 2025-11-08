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

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { computed, makeObservable } from 'mobx';
import '../lumi_concept/lumi_concept';
import '../lumi_questions/lumi_questions';
import '../tab_component/tab_component';
import '../table_of_contents/table_of_contents';
import './sidebar_header';
import { styles } from './sidebar.scss';

import { DocumentStateService } from '../../services/document_state.service';
import { core } from '../../core/core';
import { consume } from '@lit/context';
import { scrollContext, ScrollState } from '../../contexts/scroll_context';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';
import { SIDEBAR_TABS } from '../../shared/constants';
import {
  AnswerHighlightTooltipProps,
  FloatingPanelService,
} from '../../services/floating_panel_service';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { HistoryService } from '../../services/history.service';
import { LumiAnswer } from '../../shared/api';
import { createRef, Ref, ref } from 'lit/directives/ref.js';

/**
 * A sidebar component that displays a list of concepts.
 */
@customElement('lumi-sidebar')
export class LumiSidebar extends LightMobxLitElement {
  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly historyService = core.getService(HistoryService);
  private readonly collapseManager = this.documentStateService.collapseManager;

  @query('.tabs-container')
  private readonly tabsContainer!: HTMLDivElement;

  private scrollContainerRef: Ref<HTMLElement> = createRef();

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  constructor() {
    super();
    makeObservable(this);
  }

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete.then(() => {
      if (this.scrollContainerRef.value) {
        this.scrollContext?.registerAnswersScrollContainer(
          this.scrollContainerRef
        );
      }
    });
  }

  override disconnectedCallback() {
    this.scrollContext?.unregisterAnswersScrollContainer();
    super.disconnectedCallback();
  }

  private renderHeader() {
    const handleTabClick = (tab: string) => {
      this.analyticsService.trackAction(AnalyticsAction.SIDEBAR_TAB_CHANGE);
      this.collapseManager?.setSidebarTabSelection(tab);
      if (this.collapseManager?.isMobileSidebarCollapsed) {
        this.collapseManager?.toggleMobileSidebarCollapsed();
      }
    };
    const selectedTab = this.collapseManager?.sidebarTabSelection;

    return html`
      <sidebar-header>
        <div class="tabs-header">
          ${Object.values(SIDEBAR_TABS).map(
            (tab) => html`
              <button
                class="tab-button ${selectedTab === tab ? 'selected' : ''}"
                @click=${() => handleTabClick(tab)}
              >
                ${tab}
              </button>
            `
          )}
        </div>
      </sidebar-header>
    `;
  }

  private renderQuestions() {
    const classes = {
      'lumi-questions-container': true,
    };

    return html`
      <div class=${classMap(classes)} slot=${SIDEBAR_TABS.ANSWERS}>
        <lumi-questions></lumi-questions>
      </div>
    `;
  }

  private readonly handleAnswerHighlightClick = (
    answer: LumiAnswer,
    target: HTMLElement
  ) => {
    const props = new AnswerHighlightTooltipProps(answer);
    this.floatingPanelService.show(props, target);
  };

  private renderConcepts() {
    if (!this.collapseManager) return nothing;

    const concepts =
      this.documentStateService.lumiDocManager?.lumiDoc.concepts || [];

    return html`
      <div class="concepts-container" slot=${SIDEBAR_TABS.CONCEPTS}>
        <div class="concepts-list">
          ${concepts.map(
            (concept) =>
              html`<lumi-concept
                .concept=${concept}
                .highlightManager=${this.documentStateService.highlightManager}
                .answerHighlightManager=${this.historyService
                  .answerHighlightManager}
                .onAnswerHighlightClick=${this.handleAnswerHighlightClick.bind(
                  this
                )}
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
            this.analyticsService.trackAction(
              AnalyticsAction.SIDEBAR_TOC_SECTION_CLICK
            );

            this.scrollContext?.scrollToSection(sectionId);
          }}
        ></table-of-contents>
      </div>
    `;
  }

  private renderContents() {
    const tabsContainerClasses = classMap({
      ['tabs-container']: true,
      ['is-mobile-sidebar-collapsed']:
        this.collapseManager?.isMobileSidebarCollapsed ?? true,
    });

    return html`
      <div class="contents">
        ${this.renderHeader()}
        <div class=${tabsContainerClasses} ${ref(this.scrollContainerRef)}>
          <tab-component
            .tabs=${Object.values(SIDEBAR_TABS)}
            .selectedTab=${this.collapseManager?.sidebarTabSelection}
          >
            ${this.renderQuestions()} ${this.renderConcepts()}
            ${this.renderToc()}
          </tab-component>
        </div>
        ${this.renderMobileCollapseButton()}
      </div>
    `;
  }

  private renderMobileCollapseButton() {
    const icon = this.collapseManager?.isMobileSidebarCollapsed
      ? 'keyboard_arrow_down'
      : 'keyboard_arrow_up';
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

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="sidebar-host">${this.renderContents()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-sidebar': LumiSidebar;
  }
}
