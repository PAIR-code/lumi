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
 * distributed under the "License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { HighlightManager } from '../../shared/highlight_manager';
import { InnerTag } from '../../shared/lumi_doc';

/**
 * Flattens a list of potentially nested `InnerTag`s into a single list.
 *
 * This function recursively traverses the `children` of each `InnerTag`,
 * adjusting their positions to be relative to the root `LumiSpan`'s text
 * instead of their parent tag's content.
 *
 * @param tags The list of `InnerTag`s to flatten.
 * @param parentOffset The starting position of the parent tag, used to
 *   calculate the absolute position of child tags. Defaults to 0.
 * @returns A new, flat list of `InnerTag`s with absolute positions.
 */
export function flattenTags(
  tags: InnerTag[],
  parentOffset: number = 0
): InnerTag[] {
  const flattened: InnerTag[] = [];

  for (const tag of tags) {
    // Adjust the tag's position by the parent's offset.
    const absolutePosition = {
      startIndex: tag.position.startIndex + parentOffset,
      endIndex: tag.position.endIndex + parentOffset,
    };

    // Add the current tag (without its children) to the flattened list.
    flattened.push({
      ...tag,
      position: absolutePosition,
      children: undefined,
    });

    // If the tag has children, recursively flatten them, passing the
    // current tag's absolute start index as the new offset.
    if (tag.children && tag.children.length > 0) {
      flattened.push(...flattenTags(tag.children, absolutePosition.startIndex));
    }
  }

  return flattened;
}

export function getSpanHighlightsFromManagers(
  spanId: string,
  highlightManager?: HighlightManager,
  answerHighlightManager?: AnswerHighlightManager
) {
  const highlights = [];
  if (highlightManager) {
    highlights.push(...highlightManager.getSpanHighlights(spanId));
  }

  if (answerHighlightManager) {
    highlights.push(...answerHighlightManager.getSpanHighlights(spanId));
  }

  return highlights;
}
