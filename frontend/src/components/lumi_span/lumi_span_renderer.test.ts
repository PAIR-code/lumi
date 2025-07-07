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

import { csrFixture as fixture } from "@lit-labs/testing/fixtures.js";
import { html } from "lit";
import { expect } from "@esm-bundle/chai";

import { renderLumiSpan } from "./lumi_span_renderer";
import { Highlight, InnerTagName, LumiSpan } from "../../shared/lumi_doc";

describe("renderLumiSpan", () => {
  it("renders a simple span", async () => {
    const span: LumiSpan = {
      id: "s1",
      text: "hello world",
      innerTags: [],
    };

    const el = await fixture(html`<div>${renderLumiSpan({ span })}</div>`, {
      modules: [],
    });
    expect(el.textContent).to.equal("hello world");
  });

  it("renders a span with bold text", async () => {
    const span: LumiSpan = {
      id: "s1",
      text: "hello bold world",
      innerTags: [
        {
          tagName: InnerTagName.BOLD,
          position: { startIndex: 6, endIndex: 9 },
          metadata: {},
        },
      ],
    };

    const el = await fixture(html`<div>${renderLumiSpan({ span })}</div>`, {
      modules: [],
    });
    const boldEls = el.querySelectorAll("span.b");
    expect(boldEls.length).to.equal(4);
    const expectedTextContents = ["b", "o", "l", "d"];
    expectedTextContents.forEach((expectedContent, index) => {
      expect(boldEls[index]).to.exist;
      expect(boldEls[index]!.textContent).to.equal(expectedContent);
    });
  });

  it("renders a span with a link", async () => {
    const span: LumiSpan = {
      id: "s1",
      text: "a link to google",
      innerTags: [
        {
          tagName: InnerTagName.A,
          position: { startIndex: 2, endIndex: 5 },
          metadata: { href: "https://www.google.com" },
        },
      ],
    };

    const el = await fixture(html`<div>${renderLumiSpan({ span })}</div>`, {
      modules: [],
    });
    const linkEls = el.querySelectorAll("a");
    const expectedTextContents = ["l", "i", "n", "k"];
    expectedTextContents.forEach((expectedContent, index) => {
      const linkEl = linkEls[index];
      expect(linkEl).to.exist;
      expect(linkEl!.textContent).to.equal(expectedContent);
      expect(linkEl!.href).to.equal("https://www.google.com/");
    });
  });

  it("renders a span with a highlight", async () => {
    const span: LumiSpan = {
      id: "s1",
      text: "some highlighted text",
      innerTags: [],
    };
    const highlights: Highlight[] = [
      {
        color: "yellow",
        spanId: "s1",
        position: { startIndex: 5, endIndex: 16 },
      },
    ];

    const el = await fixture(
      html`<div>${renderLumiSpan({ span, highlights })}</div>`,
      { modules: [] }
    );
    const highlightedEls = el.querySelectorAll("span.yellow");
    expect(highlightedEls.length).to.equal(11); // 'highlighted'.length
    expect(el.textContent).to.equal("some highlighted text");
    expect(highlightedEls[0].textContent).to.equal("h");
    expect(highlightedEls[10].textContent).to.equal("d");
  });

  it("renders a span with an equation", async () => {
    const span: LumiSpan = {
      id: "s2",
      text: "An equation: E=mc^2",
      innerTags: [
        {
          tagName: InnerTagName.MATH,
          position: { startIndex: 13, endIndex: 18 },
          metadata: {},
        },
      ],
    };

    const el = await fixture(html`<div>${renderLumiSpan({ span })}</div>`, {
      modules: ["./lumi_span_renderer.ts"],
    });

    // Check that the text outside the equation is still there
    expect(el.textContent).to.include("An equation:");

    // Check for the KaTeX rendered element
    const katexEl = el.querySelector(".katex");
    expect(katexEl).to.exist;

    // Check for specific KaTeX rendered content if possible
    const miE = katexEl!.querySelector(".mord.mathnormal");
    expect(miE).to.exist;
    expect(miE!.textContent).to.equal("E");
  });
});
