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

import { expect } from "@esm-bundle/chai";
import { csrFixture as fixture } from "@lit-labs/testing/fixtures.js";
import { html } from "lit";
import { getSelectionInfo, SelectionInfo } from "./selection_utils";
import "./lumi_doc";

class MockLumiSpan extends HTMLElement {}
customElements.define("lumi-span", MockLumiSpan);

class ParentWithShadow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
}
customElements.define("parent-with-shadow", ParentWithShadow);

/**
 * Test helper to create the DOM structure expected by getSelectionInfo.
 * It mimics the output of `renderLumiSpan` where each character is in its own
 * span.
 * @param text The text content for the lumi-span.
 * @returns A span element containing character-spans.
 */
function createCharacterSpans(text: string): HTMLSpanElement {
  const outerSpan = document.createElement("span");
  outerSpan.className = "outer-span";
  for (const char of text) {
    const charSpan = document.createElement("span");
    charSpan.textContent = char;
    outerSpan.appendChild(charSpan);
  }
  return outerSpan;
}

describe("getSelectionInfo", () => {
  it("should return selection info for a partial selection within a single lumi-span", async () => {
    // 1. Create a fixture with our mock <lumi-span> element.
    const el = await fixture(
      html` <parent-with-shadow></parent-with-shadow> `,
      { modules: [] }
    );
    const lumiSpan = document.createElement("lumi-span");
    lumiSpan.id = "test-span-1";
    const textContent = "This is some test text.";
    const characterSpans = createCharacterSpans(textContent);
    lumiSpan.appendChild(characterSpans);

    el.shadowRoot!.appendChild(lumiSpan);
    const charSpans = characterSpans.querySelectorAll("span");
    const startNode = charSpans[5].firstChild!; // "i" in "is"
    const endNode = charSpans[11].firstChild!; // "e" in "some"

    // Programmatically create a text selection
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(startNode, 0);
    range.setEnd(endNode, 1);
    selection.removeAllRanges();
    selection.addRange(range);

    const selectionInfo = getSelectionInfo(
      window.getSelection()!,
      el.shadowRoot!
    );

    expect(selectionInfo).to.not.be.null;
    expect(selectionInfo!.selectedText).to.equal("is some");
    expect(selectionInfo!.highlightSelection).to.deep.equal([
      { spanId: "test-span-1", position: { startIndex: 5, endIndex: 12 } },
    ]);
  });

  it("should return null if selection is empty", async () => {
    const el = await fixture(html`<parent-with-shadow></parent-with-shadow>`, {
      modules: [],
    });
    const selection = window.getSelection()!;
    selection.removeAllRanges(); // Ensure it's empty
    const selectionInfo = getSelectionInfo(selection, el.shadowRoot!);
    expect(selectionInfo).to.be.null;
  });

  it("should return null if getComposedRanges returns an empty array", async () => {
    const el = await fixture(html`<parent-with-shadow></parent-with-shadow>`, {
      modules: [],
    });
    const selection = window.getSelection()!;
    selection.removeAllRanges();

    // @ts-ignore - Mocking getComposedRanges for this specific test case
    selection.getComposedRanges = () => [];

    const selectionInfo = getSelectionInfo(selection, el.shadowRoot!);
    expect(selectionInfo).to.be.null;
  });

  it("should return selection info for a selection spanning multiple lumi-spans", async () => {
    const el = await fixture(html`<parent-with-shadow></parent-with-shadow>`, {
      modules: [],
    });

    // LumiSpan 1
    const lumiSpan1 = document.createElement("lumi-span");
    lumiSpan1.id = "test-span-1";
    const text1 = "First part. ";
    lumiSpan1.appendChild(createCharacterSpans(text1));

    // LumiSpan 2
    const lumiSpan2 = document.createElement("lumi-span");
    lumiSpan2.id = "test-span-2";
    const text2 = "Second part. ";
    lumiSpan2.appendChild(createCharacterSpans(text2));

    // LumiSpan 3
    const lumiSpan3 = document.createElement("lumi-span");
    lumiSpan3.id = "test-span-3";
    const text3 = "Third part.";
    lumiSpan3.appendChild(createCharacterSpans(text3));

    el.shadowRoot!.appendChild(lumiSpan1);
    el.shadowRoot!.appendChild(lumiSpan2);
    el.shadowRoot!.appendChild(lumiSpan3);

    const charSpans1 = lumiSpan1.querySelectorAll("span > span");
    const charSpans3 = lumiSpan3.querySelectorAll("span > span");

    const startNode = charSpans1[6].firstChild!; // "p" in "part. "
    const endNode = charSpans3[4].firstChild!; // "d" in "Third"

    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(startNode, 0);
    range.setEnd(endNode, 1);
    selection.removeAllRanges();
    selection.addRange(range);

    // @ts-ignore - Mocking getComposedRanges for this specific test case
    selection.getComposedRanges = () => [range];

    const selectionInfo = getSelectionInfo(selection, el.shadowRoot!);

    expect(selectionInfo).to.not.be.null;
    expect(selectionInfo!.selectedText).to.equal("part. Second part. Third");
    expect(selectionInfo!.highlightSelection).to.deep.equal([
      { spanId: "test-span-1", position: { startIndex: 6, endIndex: 13 } },
      { spanId: "test-span-2", position: { startIndex: 0, endIndex: 14 } },
      { spanId: "test-span-3", position: { startIndex: 0, endIndex: 5 } },
    ]);
  });
});
