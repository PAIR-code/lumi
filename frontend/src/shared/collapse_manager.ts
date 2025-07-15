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
import { LumiDoc } from "./lumi_doc";
import { LumiDocManager } from "./lumi_doc_manager";

const INITIAL_COLLAPSE_STATE = true;
/**
 * Manages the collapse/expand state of sections in a document.
 */
export class CollapseManager {
  sectionCollapseState = new Map<string, boolean>();
  isAbstractCollapsed = INITIAL_COLLAPSE_STATE;

  constructor(private readonly lumiDocManager: LumiDocManager) {
    makeObservable(this, {
      sectionCollapseState: observable.shallow,
      isAbstractCollapsed: observable,
      setAbstractCollapsed: action,
      toggleSection: action,
      setAllSectionsCollapsed: action,
      expandToSpan: action,
    });
  }

  initialize() {
    // Initialize all sections to be expanded.
    this.setAllSectionsCollapsed(INITIAL_COLLAPSE_STATE);
  }

  setAbstractCollapsed(isCollapsed: boolean) {
    this.isAbstractCollapsed = isCollapsed;
  }

  toggleSection(sectionId: string, isCollapsed: boolean) {
    this.sectionCollapseState.set(sectionId, isCollapsed);
  }

  getCollapseState(id: string) {
    return this.sectionCollapseState.get(id) ?? false;
  }

  areAllSectionsCollapsed() {
    if (!this.isAbstractCollapsed) return false;

    // Check if any section is not collapsed.
    const uncollapsedValue = Array.from(
      this.sectionCollapseState.values()
    ).find((isCollapsed) => !isCollapsed);
    // If we can't find an uncollapsed section, it means all are collapsed.
    return uncollapsedValue === undefined;
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
