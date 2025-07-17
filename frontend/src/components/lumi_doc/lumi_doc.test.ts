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
import * as sinon from "sinon";

import { LumiDocManager } from "../../shared/lumi_doc_manager";
import { CollapseManager } from "../../shared/collapse_manager";
import { HighlightManager } from "../../shared/highlight_manager";

import "./lumi_doc";
import "../multi_icon_toggle/multi_icon_toggle";

class MockLumiDocManager extends LumiDocManager {
  constructor(lumiDoc: any) {
    super(lumiDoc);
  }
}

class MockCollapseManager extends CollapseManager {}
class MockHighlightManager extends HighlightManager {}

describe("lumi-doc", () => {
  let lumiDocManager: LumiDocManager;
  let collapseManager: CollapseManager;
  let highlightManager: HighlightManager;

  beforeEach(() => {
    const lumiDoc = {
      metadata: {
        paperId: "12345",
        title: "Test Paper",
        authors: ["Author 1", "Author 2"],
        publishedTimestamp: "2025-07-11",
      },
      abstract: { text: "", paragraphs: [], items: [], contents: [] },
      sections: [],
      references: [],
      summaries: {
        abstract: [],
        sections: [],
      },
    };
    lumiDocManager = new MockLumiDocManager(lumiDoc);
    collapseManager = new MockCollapseManager(lumiDocManager);
    highlightManager = new MockHighlightManager();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders the initial state", async () => {
    const el = await fixture(
      html`<lumi-doc
        .lumiDocManager=${lumiDocManager}
        .collapseManager=${collapseManager}
        .highlightManager=${highlightManager}
      ></lumi-doc>`,
      { modules: [] }
    );

    const title = el.shadowRoot!.querySelector("h1");
    expect(title).to.exist;
    expect(title!.textContent).to.contain("Test Paper");
  });

  it("calls setAllSectionsCollapsed(true) when the collapse icon is clicked", async () => {
    const setAllSectionsCollapsed = sinon.spy(
      collapseManager,
      "setAllSectionsCollapsed"
    );

    const el = await fixture(
      html`<lumi-doc
        .lumiDocManager=${lumiDocManager}
        .collapseManager=${collapseManager}
        .highlightManager=${highlightManager}
      ></lumi-doc>`,
      { modules: [] }
    );

    const toggle = el.shadowRoot!.querySelector(
      "multi-icon-toggle"
    ) as HTMLElement;
    const collapseIcon = toggle.shadowRoot!.querySelector(
      'pr-icon[icon="list"]'
    )!.parentElement as HTMLElement;
    collapseIcon.click();

    expect(setAllSectionsCollapsed.calledOnceWith(true)).to.be.true;
  });

  it("calls setAllSectionsCollapsed(false) when the expand icon is clicked", async () => {
    const setAllSectionsCollapsed = sinon.spy(
      collapseManager,
      "setAllSectionsCollapsed"
    );

    const el = await fixture(
      html`<lumi-doc
        .lumiDocManager=${lumiDocManager}
        .collapseManager=${collapseManager}
        .highlightManager=${highlightManager}
      ></lumi-doc>`,
      { modules: [] }
    );

    const toggle = el.shadowRoot!.querySelector(
      "multi-icon-toggle"
    ) as HTMLElement;
    const expandIcon = toggle.shadowRoot!.querySelector(
      'pr-icon[icon="article"]'
    )!.parentElement as HTMLElement;
    expandIcon.click();

    expect(setAllSectionsCollapsed.calledOnceWith(false)).to.be.true;
  });

  it("opens arXiv link in a new tab when the open_in_new icon is clicked", async () => {
    const windowOpen = sinon.stub(window, "open");
    const el = await fixture(
      html`<lumi-doc
        .lumiDocManager=${lumiDocManager}
        .collapseManager=${collapseManager}
        .highlightManager=${highlightManager}
      ></lumi-doc>`,
      { modules: [] }
    );

    const openInNewButton = el.shadowRoot!.querySelector(
      'pr-icon-button[icon="open_in_new"]'
    ) as HTMLElement;
    openInNewButton.click();

    expect(windowOpen.calledOnce).to.be.true;
  });
});
