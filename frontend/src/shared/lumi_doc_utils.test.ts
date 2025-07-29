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
import { getReferencedSpanIdsFromContent } from "./lumi_doc_utils";
import { InnerTagName, LumiContent, LumiSpan } from "./lumi_doc";

// Helper to create a mock LumiSpan with spanref tags
const createSpanWithRefs = (id: string, refIds: string[]): LumiSpan => ({
  id,
  text: `span ${id}`,
  innerTags: refIds.map((refId) => ({
    tagName: InnerTagName.SPAN_REFERENCE,
    position: { startIndex: 0, endIndex: 1 },
    metadata: { id: refId },
  })),
});

// Helper to create a mock LumiSpan without spanref tags
const createSpanWithoutRefs = (id: string): LumiSpan => ({
  id,
  text: `span ${id}`,
  innerTags: [],
});

// Helper to create a mock LumiContent with spans
const createContentWithSpans = (spans: LumiSpan[]): LumiContent => ({
  id: "content-id",
  textContent: {
    tagName: "p",
    spans: spans,
  },
  imageContent: null,
  htmlFigureContent: null,
  listContent: null,
  figureContent: null,
});

describe("getReferencedSpanIdsFromContent", () => {
  it("should return an empty array if there is no content", () => {
    expect(getReferencedSpanIdsFromContent([])).to.deep.equal([]);
  });

  it("should return an empty array if content has no spans with refs", () => {
    const contents = [
      createContentWithSpans([
        createSpanWithoutRefs("span-1"),
        createSpanWithoutRefs("span-2"),
      ]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.deep.equal([]);
  });

  it("should extract a single reference ID from textContent", () => {
    const contents = [
      createContentWithSpans([createSpanWithRefs("span-1", ["ref-A"])]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.deep.equal(["ref-A"]);
  });

  it("should extract multiple reference IDs from multiple contents", () => {
    const contents = [
      createContentWithSpans([createSpanWithRefs("span-1", ["ref-A"])]),
      createContentWithSpans([createSpanWithRefs("span-2", ["ref-B"])]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.have.members([
      "ref-A",
      "ref-B",
    ]);
  });

  it("should extract unique reference IDs from listContent", () => {
    const content: LumiContent = {
      id: "list-content",
      textContent: null,
      imageContent: null,
      htmlFigureContent: null,
      figureContent: null,
      listContent: {
        isOrdered: false,
        listItems: [
          { spans: [createSpanWithRefs("span-1", ["ref-A", "ref-B"])] },
          {
            spans: [createSpanWithRefs("span-2", ["ref-A", "ref-C"])],
            subListContent: {
              isOrdered: false,
              listItems: [{ spans: [createSpanWithRefs("span-3", ["ref-D"])] }],
            },
          },
        ],
      },
    };
    const result = getReferencedSpanIdsFromContent([content]);
    expect(result).to.have.lengthOf(4);
    expect(result).to.have.members(["ref-A", "ref-B", "ref-C", "ref-D"]);
  });

  it("should handle mixed content types", () => {
    const contents: LumiContent[] = [
      createContentWithSpans([createSpanWithRefs("span-1", ["ref-A"])]),
      {
        id: "list-content",
        textContent: null,
        imageContent: null,
        htmlFigureContent: null,
        listContent: {
          isOrdered: true,
          listItems: [{ spans: [createSpanWithRefs("span-2", ["ref-B"])] }],
        },
        figureContent: null,
      },
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.have.members([
      "ref-A",
      "ref-B",
    ]);
  });
});
