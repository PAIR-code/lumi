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
import {
  getAllContents,
  getAllSpansFromContents,
  getReferencedSpanIdsFromContent,
} from './lumi_doc_utils';
import { InnerTagName, LumiContent, LumiSection, LumiSpan } from './lumi_doc';

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
  id: 'content-id',
  textContent: {
    tagName: 'p',
    spans: spans,
  },
  imageContent: null,
  htmlFigureContent: null,
  listContent: null,
  figureContent: null,
});

// Helper to create a mock LumiContent
const createMockContent = (id: string): LumiContent => ({
  id,
  textContent: {
    tagName: 'p',
    spans: [{ id: `span-for-${id}`, text: `text for ${id}`, innerTags: [] }],
  },
  imageContent: null,
  figureContent: null,
  htmlFigureContent: null,
  listContent: null,
});

describe('getReferencedSpanIdsFromContent', () => {
  it('should return an empty array if there is no content', () => {
    expect(getReferencedSpanIdsFromContent([])).to.deep.equal([]);
  });

  it('should return an empty array if content has no spans with refs', () => {
    const contents = [
      createContentWithSpans([
        createSpanWithoutRefs('span-1'),
        createSpanWithoutRefs('span-2'),
      ]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.deep.equal([]);
  });

  it('should extract a single reference ID from textContent', () => {
    const contents = [
      createContentWithSpans([createSpanWithRefs('span-1', ['ref-A'])]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.deep.equal(['ref-A']);
  });

  it('should extract multiple reference IDs from multiple contents', () => {
    const contents = [
      createContentWithSpans([createSpanWithRefs('span-1', ['ref-A'])]),
      createContentWithSpans([createSpanWithRefs('span-2', ['ref-B'])]),
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.have.members([
      'ref-A',
      'ref-B',
    ]);
  });

  it('should extract unique reference IDs from listContent', () => {
    const content: LumiContent = {
      id: 'list-content',
      textContent: null,
      imageContent: null,
      htmlFigureContent: null,
      figureContent: null,
      listContent: {
        isOrdered: false,
        listItems: [
          { spans: [createSpanWithRefs('span-1', ['ref-A', 'ref-B'])] },
          {
            spans: [createSpanWithRefs('span-2', ['ref-A', 'ref-C'])],
            subListContent: {
              isOrdered: false,
              listItems: [{ spans: [createSpanWithRefs('span-3', ['ref-D'])] }],
            },
          },
        ],
      },
    };
    const result = getReferencedSpanIdsFromContent([content]);
    expect(result).to.have.lengthOf(4);
    expect(result).to.have.members(['ref-A', 'ref-B', 'ref-C', 'ref-D']);
  });

  it('should handle mixed content types', () => {
    const contents: LumiContent[] = [
      createContentWithSpans([createSpanWithRefs('span-1', ['ref-A'])]),
      {
        id: 'list-content',
        textContent: null,
        imageContent: null,
        htmlFigureContent: null,
        listContent: {
          isOrdered: true,
          listItems: [{ spans: [createSpanWithRefs('span-2', ['ref-B'])] }],
        },
        figureContent: null,
      },
    ];
    expect(getReferencedSpanIdsFromContent(contents)).to.have.members([
      'ref-A',
      'ref-B',
    ]);
  });
});

describe('getAllContents', () => {
  it("should return the section's contents when there are no subsections", () => {
    const content1 = createMockContent('c1');
    const section: LumiSection = {
      id: 's1',
      heading: { headingLevel: 1, text: 'Section 1' },
      contents: [content1],
    };
    expect(getAllContents(section)).to.deep.equal([content1]);
  });

  it('should return a flattened array from multiple levels of nested subsections', () => {
    const c1 = createMockContent('c1');
    const c2 = createMockContent('c2');
    const c3 = createMockContent('c3');
    const c4 = createMockContent('c4');
    const section: LumiSection = {
      id: 's1',
      heading: { headingLevel: 1, text: 'Section 1' },
      contents: [c1],
      subSections: [
        {
          id: 's1-1',
          heading: { headingLevel: 2, text: 'Sub 1-1' },
          contents: [c2],
          subSections: [
            {
              id: 's1-1-1',
              heading: { headingLevel: 3, text: 'Sub 1-1-1' },
              contents: [c3],
            },
          ],
        },
        {
          id: 's1-2',
          heading: { headingLevel: 2, text: 'Sub 1-2' },
          contents: [c4],
        },
      ],
    };
    expect(getAllContents(section)).to.have.deep.members([c1, c2, c3, c4]);
  });

  it('should handle sections with no contents of their own but with subsections that have contents', () => {
    const c1 = createMockContent('c1');
    const section: LumiSection = {
      id: 's1',
      heading: { headingLevel: 1, text: 'Section 1' },
      contents: [],
      subSections: [
        {
          id: 's1-1',
          heading: { headingLevel: 2, text: 'Sub 1-1' },
          contents: [c1],
        },
      ],
    };
    expect(getAllContents(section)).to.deep.equal([c1]);
  });

  it('should return an empty array for a section with no contents and no subsections', () => {
    const section: LumiSection = {
      id: 's1',
      heading: { headingLevel: 1, text: 'Section 1' },
      contents: [],
      subSections: [],
    };
    expect(getAllContents(section)).to.deep.equal([]);
  });
});

describe('getAllSpansFromContents', () => {
  const span1: LumiSpan = { id: 's1', text: 'one', innerTags: [] };
  const span2: LumiSpan = { id: 's2', text: 'two', innerTags: [] };
  const span3: LumiSpan = { id: 's3', text: 'three', innerTags: [] };
  const span4: LumiSpan = { id: 's4', text: 'four', innerTags: [] };
  const span5: LumiSpan = { id: 's5', text: 'five', innerTags: [] };

  it('should return an empty array for empty content', () => {
    expect(getAllSpansFromContents([])).to.deep.equal([]);
  });

  it('should extract spans from textContent', () => {
    const contents: LumiContent[] = [
      {
        id: 'c1',
        textContent: { tagName: 'p', spans: [span1, span2] },
        imageContent: null,
        figureContent: null,
        htmlFigureContent: null,
        listContent: null,
      },
    ];
    expect(getAllSpansFromContents(contents)).to.deep.equal([span1, span2]);
  });

  it('should extract spans from listContent, including nested lists', () => {
    const contents: LumiContent[] = [
      {
        id: 'c1',
        textContent: null,
        imageContent: null,
        figureContent: null,
        htmlFigureContent: null,
        listContent: {
          isOrdered: false,
          listItems: [
            { spans: [span1] },
            {
              spans: [span2],
              subListContent: {
                isOrdered: false,
                listItems: [{ spans: [span3] }],
              },
            },
          ],
        },
      },
    ];
    expect(getAllSpansFromContents(contents)).to.have.deep.members([
      span1,
      span2,
      span3,
    ]);
  });

  it('should extract spans from various captions', () => {
    const contents: LumiContent[] = [
      {
        id: 'c1',
        textContent: null,
        imageContent: {
          storagePath: '',
          latexPath: '',
          caption: span1,
          altText: '',
          width: 0,
          height: 0,
        },
        figureContent: null,
        htmlFigureContent: null,
        listContent: null,
      },
      {
        id: 'c2',
        textContent: null,
        imageContent: null,
        figureContent: { images: [], caption: span2 },
        htmlFigureContent: null,
        listContent: null,
      },
      {
        id: 'c3',
        textContent: null,
        imageContent: null,
        figureContent: null,
        htmlFigureContent: { html: '', caption: span3 },
        listContent: null,
      },
    ];
    expect(getAllSpansFromContents(contents)).to.have.deep.members([
      span1,
      span2,
      span3,
    ]);
  });

  it('should handle mixed content types and collect all spans', () => {
    const contents: LumiContent[] = [
      {
        id: 'c1',
        textContent: { tagName: 'p', spans: [span1] },
        imageContent: null,
        figureContent: null,
        htmlFigureContent: null,
        listContent: null,
      },
      {
        id: 'c2',
        textContent: null,
        imageContent: {
          storagePath: '',
          latexPath: '',
          caption: span2,
          altText: '',
          width: 0,
          height: 0,
        },
        figureContent: null,
        htmlFigureContent: null,
        listContent: null,
      },
      {
        id: 'c3',
        textContent: null,
        imageContent: null,
        figureContent: null,
        htmlFigureContent: null,
        listContent: {
          isOrdered: true,
          listItems: [
            { spans: [span3] },
            {
              spans: [span4],
              subListContent: {
                isOrdered: false,
                listItems: [{ spans: [span5] }],
              },
            },
          ],
        },
      },
    ];
    expect(getAllSpansFromContents(contents)).to.have.deep.members([
      span1,
      span2,
      span3,
      span4,
      span5,
    ]);
  });
});
