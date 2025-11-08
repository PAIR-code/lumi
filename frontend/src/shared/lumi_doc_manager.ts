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

import {
  ListContent,
  LumiConcept,
  LumiContent,
  LumiDoc,
  LumiSection,
  LumiSpan,
} from './lumi_doc';
import { LumiSummaryMaps } from './lumi_summary_maps';

function makeEmptySummaries() {
  return {
    sectionSummaries: [],
    contentSummaries: [],
    spanSummaries: [],
  };
}

/**
 * A helper class for manipulating a LumiDoc.
 * e.g. efficiently helps to look up spans in a LumiDoc by their ID.
 */
export class LumiDocManager {
  private readonly spanMap = new Map<string, LumiSpan>();
  private readonly spanToSectionMap = new Map<string, LumiSection>();
  private readonly sectionToParentMap = new Map<string, LumiSection>();
  private readonly innerSummaryMaps: LumiSummaryMaps;
  private readonly innerLumiDoc: LumiDoc;
  private readonly conceptMap = new Map<string, LumiConcept>();

  constructor(lumiDoc: LumiDoc) {
    this.innerLumiDoc = lumiDoc;
    this.innerSummaryMaps = new LumiSummaryMaps(
      this.innerLumiDoc.summaries ?? makeEmptySummaries()
    );

    this.initializeMaps(this.innerLumiDoc);
  }

  get lumiDoc() {
    return this.innerLumiDoc;
  }

  get summaryMaps() {
    return this.innerSummaryMaps;
  }

  /**
   * Retrieves a LumiSpan by its ID.
   * @param id The ID of the span to retrieve.
   * @returns The LumiSpan if found, otherwise undefined.
   */
  getSpanById(id: string): LumiSpan | undefined {
    return this.spanMap.get(id);
  }

  /**
   * Retrieves a LumiSpan by its ID.
   * @param id The ID of the span to retrieve.
   * @returns The LumiSpan if found, otherwise undefined.
   */
  getConceptById(id: string): LumiConcept | undefined {
    return this.conceptMap.get(id);
  }

  /**
   * Retrieves the LumiSection that contains a given span.
   * @param spanId The ID of the span.
   * @returns The LumiSection if found, otherwise undefined.
   */
  getSectionForSpan(spanId: string): LumiSection | undefined {
    return this.spanToSectionMap.get(spanId);
  }

  /**
   * Retrieves the parent section of a given section.
   * @param sectionId The ID of the section.
   * @returns The parent LumiSection if it exists, otherwise undefined.
   */
  getParentSection(sectionId: string): LumiSection | undefined {
    return this.sectionToParentMap.get(sectionId);
  }

  get spanIds() {
    return Array.from(this.spanMap.keys());
  }

  private initializeMaps(lumiDoc: LumiDoc) {
    // Index spans in the abstract
    lumiDoc.abstract.contents.forEach((content) => {
      this.addContentSpans(content);
    });

    // Index spans in sections
    lumiDoc.sections.forEach((section) => {
      this.addSectionSpans(section);
    });

    // Index spans in references
    lumiDoc.references.forEach((reference) => {
      this.spanMap.set(reference.span.id, reference.span);
    });

    lumiDoc.concepts.forEach((concept) => {
      this.conceptMap.set(concept.id, concept);
    });
  }

  private addSectionSpans(section: LumiSection, parent?: LumiSection) {
    if (parent) {
      this.sectionToParentMap.set(section.id, parent);
    }
    section.contents.forEach((content) => {
      this.addContentSpans(content, section);
    });

    if (section.subSections) {
      section.subSections.forEach((subSection) => {
        this.addSectionSpans(subSection, section);
      });
    }
  }

  private addListContentSpans(listContent: ListContent, section?: LumiSection) {
    if (listContent.listItems) {
      listContent.listItems.forEach((item) => {
        item.spans.forEach((span) => {
          this.spanMap.set(span.id, span);
          if (section) {
            this.spanToSectionMap.set(span.id, section);
          }
        });
        if (item.subListContent) {
          this.addListContentSpans(item.subListContent, section);
        }
      });
    }
  }

  private addContentSpans(content: LumiContent, section?: LumiSection) {
    if (content.textContent?.spans) {
      content.textContent.spans.forEach((span) => {
        this.spanMap.set(span.id, span);
        if (section) {
          this.spanToSectionMap.set(span.id, section);
        }
      });
    }
    if (content.listContent) {
      this.addListContentSpans(content.listContent, section);
    }
  }
}
