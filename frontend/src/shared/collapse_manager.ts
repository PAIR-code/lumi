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

import { action, makeObservable, observable } from 'mobx';
import { LumiSection } from './lumi_doc';
import { LumiDocManager } from './lumi_doc_manager';
import { isViewportSmall } from './responsive_utils';
import { INITIAL_SIDEBAR_TAB } from './constants';

const INITIAL_SECTION_COLLAPSE_STATE = false;
const INITIAL_REFERENCES_COLLAPSE_STATE = true;
const INITIAL_FOOTNOTES_COLLAPSE_STATE = true;
const INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE = true;
const INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE = false;
const INITIAL_MOBILE_SIDEBAR_COLLAPSED = true;

export type CollapseState = 'collapsed' | 'expanded' | 'indeterminate';

/**
 * Manages the collapse/expand state of sections in a document.
 */
export class CollapseManager {
  mobileSummaryCollapseState = new Map<string, boolean>();
  isAbstractCollapsed = INITIAL_SECTION_COLLAPSE_STATE;
  areReferencesCollapsed = INITIAL_REFERENCES_COLLAPSE_STATE;
  areFootnotesCollapsed = INITIAL_FOOTNOTES_COLLAPSE_STATE;

  // Sidebar state
  sidebarTabSelection: string = INITIAL_SIDEBAR_TAB;
  isMobileSidebarCollapsed = INITIAL_MOBILE_SIDEBAR_COLLAPSED;

  constructor(private readonly lumiDocManager: LumiDocManager) {
    makeObservable(this, {
      mobileSummaryCollapseState: observable.shallow,
      isAbstractCollapsed: observable,
      areReferencesCollapsed: observable,
      areFootnotesCollapsed: observable,
      sidebarTabSelection: observable,
      isMobileSidebarCollapsed: observable,
      setAbstractCollapsed: action,
      setReferencesCollapsed: action,
      setFootnotesCollapsed: action,
      getMobileSummaryCollapseState: action,
      toggleMobileSummaryCollapse: action,
      setSidebarTabSelection: action,
      toggleMobileSidebarCollapsed: action,
    });
  }

  initialize() {
    const summaryCollapseState = isViewportSmall()
      ? INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE
      : INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE;
    this.setAllMobileSummariesCollapsed(summaryCollapseState);
  }

  // Document section methods
  setAbstractCollapsed(isCollapsed: boolean) {
    this.isAbstractCollapsed = isCollapsed;
  }

  setReferencesCollapsed(isCollapsed: boolean) {
    this.areReferencesCollapsed = isCollapsed;
  }

  setFootnotesCollapsed(isCollapsed: boolean) {
    this.areFootnotesCollapsed = isCollapsed;
  }

  getMobileSummaryCollapseState(contentId: string) {
    return this.mobileSummaryCollapseState.get(contentId) ?? false;
  }

  toggleMobileSummaryCollapse(contentId: string) {
    const currentState = this.getMobileSummaryCollapseState(contentId);
    this.mobileSummaryCollapseState.set(contentId, !currentState);
  }

  setAllMobileSummariesCollapsed(isCollapsed: boolean) {
    const setAllCollapsedInSection = (section: LumiSection) => {
      section.contents.forEach((content) => {
        this.mobileSummaryCollapseState.set(content.id, isCollapsed);
      });

      if (section.subSections) {
        section.subSections.forEach((subSection) => {
          setAllCollapsedInSection(subSection);
        });
      }
    };

    this.lumiDocManager.lumiDoc.sections.forEach((section) => {
      setAllCollapsedInSection(section);
    });
  }

  // Sidebar methods
  setSidebarTabSelection(tab: string) {
    this.sidebarTabSelection = tab;
  }

  toggleMobileSidebarCollapsed() {
    this.isMobileSidebarCollapsed = !this.isMobileSidebarCollapsed;
  }
}
