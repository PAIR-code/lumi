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

import { expect } from '@esm-bundle/chai';
import { CollapseManager } from './collapse_manager';
import { LumiDoc, LumiSection } from './lumi_doc';
import { LumiDocManager } from './lumi_doc_manager';
import { SIDEBAR_TABS } from './constants';

// Mocks
const mockLumiDoc: LumiDoc = {
  markdown: '',
  abstract: { contents: [] },
  sections: [
    {
      id: 'sec1',
      heading: { headingLevel: 1, text: 'Section 1' },
      contents: [
        {
          id: 'content1',
          textContent: {
            tagName: 'p',
            spans: [{ id: 'span1', text: 'text', innerTags: [] }],
          },
          imageContent: null,
          htmlFigureContent: null,
          listContent: null,
          figureContent: null,
        },
      ],
      subSections: [
        {
          id: 'sub1',
          heading: { headingLevel: 2, text: 'Subsection 1.1' },
          contents: [
            {
              id: 'content2',
              textContent: {
                tagName: 'p',
                spans: [{ id: 'span2', text: 'text', innerTags: [] }],
              },
              imageContent: null,
              htmlFigureContent: null,
              listContent: null,
              figureContent: null,
            },
          ],
        },
      ],
    },
    {
      id: 'sec2',
      heading: { headingLevel: 1, text: 'Section 2' },
      contents: [],
    },
  ],
  concepts: [
    { id: 'concept1', name: 'Concept 1', inTextCitations: [], contents: [] },
    { id: 'concept2', name: 'Concept 2', inTextCitations: [], contents: [] },
  ],
  loadingStatus: 'SUCCESS',
  references: [],
};

describe('CollapseManager', () => {
  let collapseManager: CollapseManager;
  let lumiDocManager: LumiDocManager;

  beforeEach(() => {
    lumiDocManager = new LumiDocManager(mockLumiDoc);
    collapseManager = new CollapseManager(lumiDocManager);
  });

  it('should be created', () => {
    expect(collapseManager).to.exist;
  });

  describe('initialize', () => {
    it('should set all sections and abstract to expanded', () => {
      collapseManager.initialize();
      expect(collapseManager.isAbstractCollapsed).to.be.false;
    });

    it('should initialize sidebar state', () => {
      collapseManager.initialize();
      expect(collapseManager.sidebarTabSelection).to.equal(
        SIDEBAR_TABS.ANSWERS
      );
      expect(collapseManager.isMobileSidebarCollapsed).to.be.true;
    });
  });

  describe('Sidebar State Management', () => {
    beforeEach(() => {
      collapseManager.initialize();
    });

    it('should set sidebar tab selection', () => {
      collapseManager.setSidebarTabSelection(SIDEBAR_TABS.TOC);
      expect(collapseManager.sidebarTabSelection).to.equal(SIDEBAR_TABS.TOC);
    });

    it('should toggle mobile sidebar collapse state', () => {
      const initialState = collapseManager.isMobileSidebarCollapsed;
      collapseManager.toggleMobileSidebarCollapsed();
      expect(collapseManager.isMobileSidebarCollapsed).to.not.equal(
        initialState
      );
    });
  });
});
