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
import { HighlightManager } from './highlight_manager';
import { Highlight } from './lumi_doc';

describe('HighlightManager', () => {
  let highlightManager: HighlightManager;

  beforeEach(() => {
    highlightManager = new HighlightManager();
  });

  it('should follow the highlight lifecycle: add, remove, and clear', () => {
    // 1. Instantiate
    expect(highlightManager.highlightedSpans.size).to.equal(0);

    // 2. Add highlights
    const highlightsToAdd: Highlight[] = [
      { color: 'yellow', spanId: 'span-1' },
      { color: 'cyan', spanId: 'span-1' },
      { color: 'green', spanId: 'span-2' },
    ];
    highlightManager.addHighlights(highlightsToAdd);

    // 3. Assert addition
    expect(highlightManager.highlightedSpans.size).to.equal(2);
    expect(highlightManager.getSpanHighlights('span-1')).to.have.lengthOf(2);
    expect(highlightManager.getSpanHighlights('span-2')).to.have.lengthOf(1);
    expect(highlightManager.getSpanHighlights('span-1')[0].color).to.equal(
      'yellow'
    );

    // 4. Remove a highlight
    highlightManager.removeHighlights(['span-1']);

    // 5. Assert removal
    expect(highlightManager.highlightedSpans.size).to.equal(1);
    expect(highlightManager.getSpanHighlights('span-1')).to.be.empty;
    expect(highlightManager.getSpanHighlights('span-2')).to.have.lengthOf(1);

    // 6. Clear all highlights
    highlightManager.clearHighlights();

    // 7. Assert clear
    expect(highlightManager.highlightedSpans.size).to.equal(0);
    expect(highlightManager.getSpanHighlights('span-2')).to.be.empty;
  });
});
