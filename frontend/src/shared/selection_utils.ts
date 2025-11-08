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

import { CITATION_CLASSNAME, FOOTNOTE_CLASSNAME } from './constants';
import { Position } from './lumi_doc';

// Helper to find a parent element matching a condition
function findParent(
  startNode: Node,
  condition: (el: HTMLElement) => boolean
): HTMLElement | null {
  let current: Node | null = startNode;
  while (current) {
    if (current instanceof HTMLElement && condition(current)) {
      return current;
    }
    // Use parentElement for traversing up the DOM tree
    current = current.parentElement;
  }
  return null;
}

export interface HighlightSelection {
  spanId: string;
  position?: Position;
}

/**
 * An interface describing the information returned for a valid text selection
 * within a <lumi-span> element.
 */
export interface SelectionInfo {
  selectedText: string;
  parentSpan: HTMLElement;
  highlightSelection: HighlightSelection[];
}

/**
 * Given a text node contained in a <lumi-span>, find the character offset from the start of the
 * containing <lumi-span> element.
 */
function getOffsetInLumiSpan(textNode: Node): number {
  const characterSpan = textNode.parentElement;
  if (!characterSpan) return -1;

  const lumiSpanRendererElement = characterSpan.parentElement;
  if (!lumiSpanRendererElement) return -1;

  const lumiSpanRendererChildren = Array.from(lumiSpanRendererElement.children);
  const spanIndex = lumiSpanRendererChildren.indexOf(characterSpan);

  let inlineTagOffset = 0;

  for (const element of lumiSpanRendererChildren.slice(0, spanIndex)) {
    if (
      Array.from(element.classList).includes(CITATION_CLASSNAME) ||
      Array.from(element.classList).includes(FOOTNOTE_CLASSNAME)
    ) {
      inlineTagOffset++;
    }
  }

  return spanIndex - inlineTagOffset;
}

/**
 * Processes a `Selection` object to extract information about text selected
 * within a <lumi-span> element, accounting for Shadow DOM boundaries.
 *
 * @param selection The `Selection` object from `window.getSelection()`.
 * @param shadowRoot The `shadowRoot` of the component where selection occurs.
 * @returns A `SelectionInfo` object if a valid selection is found, otherwise `null`.
 */
export function getSelectionInfo(selection: Selection): SelectionInfo | null {
  const selectedText = selection.toString().trim();
  if (selectedText.length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!range) {
    return null;
  }

  const startLumiSpan = findParent(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === 'lumi-span'
  );

  const endLumiSpan = findParent(
    range.endContainer,
    (el) => el.tagName.toLowerCase() === 'lumi-span'
  );

  if (!startLumiSpan || !endLumiSpan || !startLumiSpan.id || !endLumiSpan.id) {
    return null;
  }

  const highlightSelection: HighlightSelection[] = [];
  const allLumiSpans: HTMLElement[] = [startLumiSpan];

  // If selection spans multiple lumi-spans, collect them all
  if (startLumiSpan !== endLumiSpan) {
    let current: Element | null = startLumiSpan;
    while (current && current !== endLumiSpan) {
      current = current.nextElementSibling;
      if (
        current instanceof HTMLElement &&
        current.tagName.toLowerCase() === 'lumi-span'
      ) {
        allLumiSpans.push(current);
      }
    }
  }

  for (const lumiSpan of allLumiSpans) {
    if (!lumiSpan.id) continue;

    // Default for the middle spans is to give the
    // full offset, from the first to last character.
    let startOffset = 0;
    let endOffset = lumiSpan.textContent?.length ?? 0;

    if (lumiSpan === startLumiSpan) {
      startOffset = getOffsetInLumiSpan(range.startContainer);
    }
    if (lumiSpan === endLumiSpan) {
      endOffset = getOffsetInLumiSpan(range.endContainer);
    }

    highlightSelection.push({
      spanId: lumiSpan.id,
      position: { startIndex: startOffset, endIndex: endOffset + 1 },
    });
  }

  const firstParentSpan = findParent(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === 'span'
  );

  if (!firstParentSpan) {
    return null;
  }

  return {
    selectedText,
    parentSpan: firstParentSpan,
    highlightSelection,
  };
}
