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

import { action, computed, makeObservable, observable } from "mobx";
import { LumiSection } from "./lumi_doc";
import { LumiDocManager } from "./lumi_doc_manager";
import { isViewportSmall } from "./responsive_utils";
import {
  INITIAL_SIDEBAR_TAB_DESKTOP,
  INITIAL_SIDEBAR_TAB_MOBILE,
  SIDEBAR_TABS,
} from "./constants";

const INITIAL_SECTION_COLLAPSE_STATE = false;
const INITIAL_REFERENCES_COLLAPSE_STATE = true;
const INITIAL_FOOTNOTES_COLLAPSE_STATE = true;
const INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE = true;
const INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE = false;
const INITIAL_CONCEPT_IS_COLLAPSED = true;
const INITIAL_MOBILE_SIDEBAR_COLLAPSED = true;

export type CollapseState = "collapsed" | "expanded" | "indeterminate";

/**
 * Manages the collapse/expand state of sections in a document.
 */
export class CollapseManager {
  // Document section collapse state
  sectionCollapseState = new Map<string, boolean>();
  mobileSummaryCollapseState = new Map<string, boolean>();
  isAbstractCollapsed = INITIAL_SECTION_COLLAPSE_STATE;
  areReferencesCollapsed = INITIAL_REFERENCES_COLLAPSE_STATE;
  areFootnotesCollapsed = INITIAL_FOOTNOTES_COLLAPSE_STATE;

  // Sidebar state
  sidebarTabSelection: string = isViewportSmall()
    ? INITIAL_SIDEBAR_TAB_MOBILE
    : INITIAL_SIDEBAR_TAB_DESKTOP;

  isMobileSidebarCollapsed = INITIAL_MOBILE_SIDEBAR_COLLAPSED;

  conceptCollapsedState = new Map<string, boolean>();

  get areAnyConceptsCollapsed() {
    return (
      this.lumiDocManager.lumiDoc.concepts.some(
        (concept) =>
          this.conceptCollapsedState.get(concept.name) ??
          INITIAL_CONCEPT_IS_COLLAPSED
      ) ?? INITIAL_CONCEPT_IS_COLLAPSED
    );
  }

  constructor(private readonly lumiDocManager: LumiDocManager) {
    makeObservable(this, {
      sectionCollapseState: observable.shallow,
      mobileSummaryCollapseState: observable.shallow,
      isAbstractCollapsed: observable,
      areReferencesCollapsed: observable,
      areFootnotesCollapsed: observable,
      sidebarTabSelection: observable,
      isMobileSidebarCollapsed: observable,
      conceptCollapsedState: observable.shallow,
      setAbstractCollapsed: action,
      setReferencesCollapsed: action,
      setFootnotesCollapsed: action,
      toggleSection: action,
      setAllSectionsCollapsed: action,
      expandToSpan: action,
      getMobileSummaryCollapseState: action,
      toggleMobileSummaryCollapse: action,
      setSidebarTabSelection: action,
      toggleMobileSidebarCollapsed: action,
      setConceptCollapsed: action,
      setAllConceptsCollapsed: action,
      toggleAllConcepts: action,
      areAnyConceptsCollapsed: computed,
    });
  }

  initialize() {
    // Initialize all sections to be expanded.
    this.setAllSectionsCollapsed(INITIAL_SECTION_COLLAPSE_STATE);

    const summaryCollapseState = isViewportSmall()
      ? INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE
      : INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE;
    this.setAllMobileSummariesCollapsed(summaryCollapseState);

    // Initialize sidebar state
    this.setAllConceptsCollapsed(INITIAL_CONCEPT_IS_COLLAPSED);
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

  toggleSection(sectionId: string, isCollapsed: boolean) {
    this.sectionCollapseState.set(sectionId, isCollapsed);
  }

  getCollapseState(id: string) {
    return this.sectionCollapseState.get(id) ?? false;
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

  getOverallCollapseState(): CollapseState {
    const allStates = [
      this.isAbstractCollapsed,
      ...this.sectionCollapseState.values(),
    ];

    const allCollapsed = allStates.every((isCollapsed) => isCollapsed);
    if (allCollapsed) {
      return "collapsed";
    }

    const allExpanded = allStates.every((isCollapsed) => !isCollapsed);
    if (allExpanded) {
      return "expanded";
    }

    return "indeterminate";
  }

  setAllSectionsCollapsed(isCollapsed: boolean) {
    this.isAbstractCollapsed = isCollapsed;

    this.lumiDocManager.lumiDoc.sections.forEach((section) => {
      this.sectionCollapseState.set(section.id, isCollapsed);
      if (section.subSections) {
        section.subSections.forEach((subSection) => {
          this.sectionCollapseState.set(subSection.id, isCollapsed);
        });
      }
    });
  }

  expandToSpan(spanId: string) {
    let section = this.lumiDocManager.getSectionForSpan(spanId);
    while (section) {
      this.sectionCollapseState.set(section.id, false);
      section = this.lumiDocManager.getParentSection(section.id);
    }
  }

  expandToSection(sectionId: string) {
    let section = this.lumiDocManager.getParentSection(sectionId);
    while (section) {
      this.sectionCollapseState.set(section.id, false);
      section = this.lumiDocManager.getParentSection(section.id);
    }
  }

  // Sidebar methods
  setSidebarTabSelection(tab: string) {
    this.sidebarTabSelection = tab;
  }

  toggleMobileSidebarCollapsed() {
    this.isMobileSidebarCollapsed = !this.isMobileSidebarCollapsed;
  }

  setConceptCollapsed(conceptName: string, isCollapsed: boolean) {
    this.conceptCollapsedState.set(conceptName, isCollapsed);
  }

  setAllConceptsCollapsed(isCollapsed: boolean) {
    this.lumiDocManager.lumiDoc.concepts.forEach((concept) => {
      this.conceptCollapsedState.set(concept.name, isCollapsed);
    });
  }

  toggleAllConcepts() {
    const areAnyCollapsed = this.areAnyConceptsCollapsed;
    const newCollapseState = areAnyCollapsed ? false : true;
    this.setAllConceptsCollapsed(newCollapseState);
  }
}
