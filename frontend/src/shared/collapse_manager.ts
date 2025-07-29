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

import { action, makeObservable, observable } from "mobx";
import { LumiSection } from "./lumi_doc";
import { LumiDocManager } from "./lumi_doc_manager";
import { isViewportSmall } from "./responsive_utils";

const INITIAL_SECTION_COLLAPSE_STATE = false;
const INITIAL_REFERENCES_COLLAPSE_STATE = true;
const INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE = true;
const INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE = false;

export type CollapseState = "collapsed" | "expanded" | "indeterminate";

/**
 * Manages the collapse/expand state of sections in a document.
 */
export class CollapseManager {
  sectionCollapseState = new Map<string, boolean>();
  mobileSummaryCollapseState = new Map<string, boolean>();
  isAbstractCollapsed = INITIAL_SECTION_COLLAPSE_STATE;
  areReferencesCollapsed = INITIAL_REFERENCES_COLLAPSE_STATE;

  constructor(private readonly lumiDocManager: LumiDocManager) {
    makeObservable(this, {
      sectionCollapseState: observable.shallow,
      mobileSummaryCollapseState: observable.shallow,
      isAbstractCollapsed: observable,
      areReferencesCollapsed: observable,
      setAbstractCollapsed: action,
      setReferencesCollapsed: action,
      toggleSection: action,
      setAllSectionsCollapsed: action,
      expandToSpan: action,
      getMobileSummaryCollapseState: action,
      toggleMobileSummaryCollapse: action,
    });
  }

  initialize() {
    // Initialize all sections to be expanded.
    this.setAllSectionsCollapsed(INITIAL_SECTION_COLLAPSE_STATE);

    const summaryCollapseState = isViewportSmall()
      ? INITIAL_MOBILE_SUMMARY_COLLAPSE_STATE
      : INITIAL_DESKTOP_SUMMARY_COLLAPSE_STATE;
    this.setAllMobileSummariesCollapsed(summaryCollapseState);
  }

  setAbstractCollapsed(isCollapsed: boolean) {
    this.isAbstractCollapsed = isCollapsed;
  }

  setReferencesCollapsed(isCollapsed: boolean) {
    this.areReferencesCollapsed = isCollapsed;
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
}
