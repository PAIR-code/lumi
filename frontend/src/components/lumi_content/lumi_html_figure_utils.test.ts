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
import * as sinon from "sinon";
import { renderKatexInHtml } from "./lumi_html_figure_utils";

// Mock katex since it's a dependency that relies on browser APIs not in test env
// and we're not testing katex itself, but our usage of it.
const katex = {
  render: (str: string, el: HTMLElement) => {
    if (str.includes("\\invalid")) {
      throw new Error("Invalid KaTeX");
    }
    el.innerHTML = `K[${str}]`;
  },
};

// Make the mock available globally for the utils file.
(globalThis as any).katex = katex;

describe("renderKatexInHtml", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should render a simple KaTeX expression", () => {
    container.innerHTML = "This is a formula: $E=mc^2$";
    renderKatexInHtml(container);
    expect(container.innerHTML).to.equal(
      "This is a formula: <span>K[E=mc^2]</span>"
    );
  });

  it("should render multiple KaTeX expressions in the same node", () => {
    container.innerHTML = "Formula one: $a^2+b^2=c^2$. Formula two: $x+y=z$.";
    renderKatexInHtml(container);
    expect(container.innerHTML).to.equal(
      "Formula one: <span>K[a^2+b^2=c^2]</span>. Formula two: <span>K[x+y=z]</span>."
    );
  });

  it("should not change content with no KaTeX expressions", () => {
    const initialHtml = "This is some text without any formulas.";
    container.innerHTML = initialHtml;
    renderKatexInHtml(container);
    expect(container.innerHTML).to.equal(initialHtml);
  });

  it("should handle invalid KaTeX syntax gracefully", () => {
    const consoleErrorSpy = sinon.spy(console, "error");
    container.innerHTML = "This has an invalid formula: $\\invalid$";
    renderKatexInHtml(container);
    // It should revert to the original text
    expect(container.innerHTML).to.equal(
      "This has an invalid formula: $\\invalid$"
    );
    // And log an error
    expect(consoleErrorSpy.called).to.be.true;
    consoleErrorSpy.restore();
  });

  it("should handle multiple text nodes correctly", () => {
    container.innerHTML =
      "<p>First formula: $a+b$</p><p>No formula here.</p><div>Another one: $c+d$</div>";
    renderKatexInHtml(container);

    expect((container.children[0] as HTMLElement)!.innerHTML).to.equal(
      "First formula: <span>K[a+b]</span>"
    );
    expect(container.children[1]!.innerHTML).to.equal("No formula here.");
    expect(container.children[2]!.innerHTML).to.equal(
      "Another one: <span>K[c+d]</span>"
    );
  });
});
