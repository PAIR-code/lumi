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
  InnerTagName,
  ListContent,
  LumiContent,
  LumiSection,
  LumiSpan,
} from './lumi_doc';

/**
 * Extracts all unique referenced span IDs from the `spanref` tags within an
 * array of LumiContent objects.
 *
 * @param contents The `LumiContent[]` that may contain `spanref` tags.
 * @returns A unique array of referenced span IDs.
 */
export function getReferencedSpanIdsFromContent(
  contents: LumiContent[]
): string[] {
  const referencedIds = new Set<string>();

  function findRefsInSpans(spans: LumiSpan[]) {
    for (const span of spans) {
      for (const tag of span.innerTags) {
        if (tag.tagName === InnerTagName.SPAN_REFERENCE && tag.metadata?.id) {
          referencedIds.add(tag.metadata.id);
        }
      }
    }
  }

  function addAllRefs(currentContents: LumiContent[]) {
    for (const content of currentContents) {
      if (content.textContent) {
        findRefsInSpans(content.textContent.spans);
      }
      if (content.listContent) {
        for (const item of content.listContent.listItems) {
          findRefsInSpans(item.spans);
          if (item.subListContent) {
            for (const subItem of item.subListContent.listItems) {
              findRefsInSpans(subItem.spans);
            }
          }
        }
      }

      if (content.imageContent?.caption) {
        findRefsInSpans([content.imageContent.caption]);
      }
      if (content.htmlFigureContent?.caption) {
        findRefsInSpans([content.htmlFigureContent.caption]);
      }
    }
  }

  addAllRefs(contents);
  return Array.from(referencedIds);
}

/**
 * Recursively traverses a LumiSection and its subSections to collect all
 * LumiContent objects into a single flat array.
 *
 * @param section The root `LumiSection` to start traversal from.
 * @returns A flat array of all `LumiContent` objects found.
 */
export function getAllContents(section: LumiSection): LumiContent[] {
  const allContents: LumiContent[] = [];

  function traverse(currentSection: LumiSection) {
    allContents.push(...currentSection.contents);

    if (currentSection.subSections) {
      for (const subSection of currentSection.subSections) {
        traverse(subSection);
      }
    }
  }

  traverse(section);
  return allContents;
}

/**
 * Extracts all `LumiSpan` objects from an array of `LumiContent` objects.
 * This function recursively traverses different content types (text, lists,
 * captions) to find all spans.
 *
 * @param contents The array of `LumiContent` objects to search through.
 * @returns A flattened array of all `LumiSpan` objects found.
 */
export function getAllSpansFromContents(contents: LumiContent[]): LumiSpan[] {
  const allSpans: LumiSpan[] = [];

  function findSpansInList(listContent: ListContent) {
    for (const item of listContent.listItems) {
      allSpans.push(...item.spans);
      if (item.subListContent) {
        findSpansInList(item.subListContent);
      }
    }
  }

  for (const content of contents) {
    if (content.textContent?.spans) {
      allSpans.push(...content.textContent.spans);
    }
    if (content.listContent) {
      findSpansInList(content.listContent);
    }
    if (content.imageContent?.caption) {
      allSpans.push(content.imageContent.caption);
    }
    if (content.figureContent?.caption) {
      allSpans.push(content.figureContent.caption);
    }
    if (content.htmlFigureContent?.caption) {
      allSpans.push(content.htmlFigureContent.caption);
    }
  }

  return allSpans;
}
