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

import { InnerTagName, LumiContent, LumiSpan } from "./lumi_doc";

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
