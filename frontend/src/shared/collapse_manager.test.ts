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
import { CollapseManager } from "./collapse_manager";
import { LumiDoc, LumiSection } from "./lumi_doc";
import { LumiDocManager } from "./lumi_doc_manager";

// Mocks
const mockLumiDoc: LumiDoc = {
  markdown: "",
  abstract: { contents: [] },
  sections: [
    {
      id: "sec1",
      heading: { headingLevel: 1, text: "Section 1" },
      contents: [
        {
          id: "content1",
          textContent: {
            tagName: "p",
            spans: [{ id: "span1", text: "text", innerTags: [] }],
          },
          imageContent: null,
          htmlFigureContent: null,
          listContent: null,
        },
      ],
      subSections: [
        {
          id: "sub1",
          heading: { headingLevel: 2, text: "Subsection 1.1" },
          contents: [
            {
              id: "content2",
              textContent: {
                tagName: "p",
                spans: [{ id: "span2", text: "text", innerTags: [] }],
              },
              imageContent: null,
              htmlFigureContent: null,
              listContent: null,
            },
          ],
        },
      ],
    },
    {
      id: "sec2",
      heading: { headingLevel: 1, text: "Section 2" },
      contents: [],
    },
  ],
  concepts: [],
  loadingStatus: "SUCCESS",
  references: [],
};

describe("CollapseManager", () => {
  let collapseManager: CollapseManager;
  let lumiDocManager: LumiDocManager;

  beforeEach(() => {
    lumiDocManager = new LumiDocManager(mockLumiDoc);
    collapseManager = new CollapseManager(lumiDocManager);
  });

  it("should be created", () => {
    expect(collapseManager).to.exist;
  });

  describe("initialize", () => {
    it("should set all sections and abstract to collapsed", () => {
      collapseManager.initialize();
      expect(collapseManager.isAbstractCollapsed).to.be.true;
      expect(collapseManager.getCollapseState("sec1")).to.be.true;
      expect(collapseManager.getCollapseState("sub1")).to.be.true;
      expect(collapseManager.getCollapseState("sec2")).to.be.true;
    });
  });

  describe("setAllSectionsCollapsed", () => {
    it("should set all sections to collapsed", () => {
      collapseManager.setAllSectionsCollapsed(true);
      expect(collapseManager.isAbstractCollapsed).to.be.true;
      expect(collapseManager.getCollapseState("sec1")).to.be.true;
      expect(collapseManager.getCollapseState("sub1")).to.be.true;
      expect(collapseManager.getCollapseState("sec2")).to.be.true;
    });

    it("should set all sections to expanded", () => {
      collapseManager.setAllSectionsCollapsed(false);
      expect(collapseManager.isAbstractCollapsed).to.be.false;
      expect(collapseManager.getCollapseState("sec1")).to.be.false;
      expect(collapseManager.getCollapseState("sub1")).to.be.false;
      expect(collapseManager.getCollapseState("sec2")).to.be.false;
    });
  });

  describe("toggleSection", () => {
    it("should toggle a single section's state without affecting others", () => {
      collapseManager.initialize(); // all true
      collapseManager.toggleSection("sec1", false);
      expect(collapseManager.getCollapseState("sec1")).to.be.false;
      expect(collapseManager.getCollapseState("sub1")).to.be.true;
      expect(collapseManager.getCollapseState("sec2")).to.be.true;
    });
  });

  describe("areAllSectionsCollapsed", () => {
    it("should return true after initialization", () => {
      collapseManager.initialize();
      expect(collapseManager.areAllSectionsCollapsed()).to.be.true;
    });

    it("should return false if the abstract is expanded", () => {
      collapseManager.initialize();
      collapseManager.setAbstractCollapsed(false);
      expect(collapseManager.areAllSectionsCollapsed()).to.be.false;
    });

    it("should return false if any section is expanded", () => {
      collapseManager.initialize();
      collapseManager.toggleSection("sec1", false);
      expect(collapseManager.areAllSectionsCollapsed()).to.be.false;
    });

    it("should return true if all sections are collapsed manually", () => {
      collapseManager.setAllSectionsCollapsed(false);
      collapseManager.setAllSectionsCollapsed(true);
      expect(collapseManager.areAllSectionsCollapsed()).to.be.true;
    });
  });

  describe("expandToSpan", () => {
    it("should expand parent and subsection to reveal a span", () => {
      collapseManager.initialize(); // all collapsed
      expect(collapseManager.getCollapseState("sec1")).to.be.true;
      expect(collapseManager.getCollapseState("sub1")).to.be.true;
      expect(collapseManager.getCollapseState("sec2")).to.be.true;

      collapseManager.expandToSpan("span2"); // span2 is in sub1, which is in sec1

      expect(collapseManager.getCollapseState("sec1")).to.be.false;
      expect(collapseManager.getCollapseState("sub1")).to.be.false;
      expect(collapseManager.getCollapseState("sec2")).to.be.true; // Unrelated section remains collapsed
    });
  });
});
