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

import { fixture, html } from '@open-wc/testing';
import { expect } from '@esm-bundle/chai';
import * as sinon from 'sinon';

import { LumiDocManager } from '../../shared/lumi_doc_manager';
import { CollapseManager } from '../../shared/collapse_manager';
import { HighlightManager } from '../../shared/highlight_manager';

import './lumi_doc';
import '../multi_icon_toggle/multi_icon_toggle';
import { LumiDoc } from '../../shared/lumi_doc';

class MockLumiDocManager extends LumiDocManager {
  constructor(lumiDoc: any) {
    super(lumiDoc);
  }
}

class MockCollapseManager extends CollapseManager {}
class MockHighlightManager extends HighlightManager {}

describe('lumi-doc', () => {
  let lumiDocManager: LumiDocManager;
  let collapseManager: CollapseManager;
  let highlightManager: HighlightManager;

  beforeEach(() => {
    const lumiDoc: LumiDoc = {
      metadata: {
        paperId: '12345',
        title: 'Test Paper',
        authors: ['Author 1', 'Author 2'],
        publishedTimestamp: '2025-07-11',
        version: '1',
        summary: 'summary',
        updatedTimestamp: '',
      },
      abstract: { contents: [] },
      sections: [],
      references: [],
      summaries: {
        sectionSummaries: [],
        contentSummaries: [],
        spanSummaries: [],
      },
      markdown: '',
      concepts: [],
      loadingStatus: 'SUCCESS',
    };
    lumiDocManager = new MockLumiDocManager(lumiDoc);
    collapseManager = new MockCollapseManager(lumiDocManager);
    highlightManager = new MockHighlightManager();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('renders the initial state', async () => {
    const el = await fixture(
      html`<lumi-doc
        .lumiDocManager=${lumiDocManager}
        .collapseManager=${collapseManager}
        .highlightManager=${highlightManager}
      ></lumi-doc>`
    );

    const title = el.querySelector('h1');
    expect(title).to.exist;
    expect(title!.textContent).to.contain('Test Paper');
  });
});
