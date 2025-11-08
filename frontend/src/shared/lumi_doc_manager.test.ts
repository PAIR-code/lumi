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
  LumiDoc,
  LumiSpan,
  LoadingStatus,
  LumiSection,
  LumiContent,
  LumiReference,
  ListContent,
  ListItem,
} from './lumi_doc';
import { LumiDocManager } from './lumi_doc_manager';

// Helper to create a mock LumiSpan
const createSpan = (id: string, text: string): LumiSpan => ({
  id,
  text,
  innerTags: [],
});

// Helper to create a mock TextContent
const createTextContent = (spans: LumiSpan[]): LumiContent => ({
  id: `content-${Math.random()}`,
  textContent: { tagName: 'p', spans },
  imageContent: null,
  htmlFigureContent: null,
  listContent: null,
  figureContent: null,
});

// Helper to create a mock ListContent
const createListContent = (items: ListItem[]): LumiContent => ({
  id: `content-${Math.random()}`,
  textContent: null,
  imageContent: null,
  htmlFigureContent: null,
  listContent: {
    listItems: items,
    isOrdered: false,
  },
  figureContent: null,
});

// Helper to create a mock ListItem
const createListItem = (
  spans: LumiSpan[],
  subList?: ListContent
): ListItem => ({
  spans,
  subListContent: subList,
});

// Helper to create a mock Section
const createSection = (
  id: string,
  contents: LumiContent[],
  subSections: LumiSection[] = []
): LumiSection => ({
  id,
  heading: { headingLevel: 1, text: 'Test Section' },
  contents,
  subSections,
});

// Helper to create a mock LumiDoc
const createDoc = (
  abstractContents: LumiContent[],
  sections: LumiSection[],
  references: LumiReference[]
): LumiDoc => ({
  markdown: '',
  abstract: { contents: abstractContents },
  sections,
  concepts: [],
  loadingStatus: LoadingStatus.SUCCESS,
  references,
});

describe('LumiDocManager', () => {
  it('should return a span by its ID using getSpanById', () => {
    const span1 = createSpan('span-1', 'Hello');
    const span2 = createSpan('span-2', 'World');
    const span3 = createSpan('span-3', 'Sub-section');
    const span4 = createSpan('span-4', 'Reference');

    const doc = createDoc(
      [],
      [
        createSection(
          'section-1',
          [createTextContent([span1])],
          [createSection('section-3', [createTextContent([span3])])]
        ),
        createSection('section-2', [createTextContent([span2])]),
      ],
      [{ id: 'ref-1', span: span4 }]
    );

    const manager = new LumiDocManager(doc);
    expect(manager).to.exist;

    expect(manager.getSpanById('span-1')).to.deep.equal(span1);
    expect(manager.getSpanById('span-2')).to.deep.equal(span2);
    expect(manager.getSpanById('span-3')).to.deep.equal(span3);
    expect(manager.getSpanById('span-4')).to.deep.equal(span4);
  });

  it('should return undefined for a non-existent span ID', () => {
    const span1 = createSpan('span-1', 'Hello');
    const doc = createDoc(
      [],
      [createSection('s1', [createTextContent([span1])])],
      []
    );
    const manager = new LumiDocManager(doc);

    expect(manager.getSpanById('non-existent-id')).to.be.undefined;
  });

  it('should handle an empty document without errors', () => {
    const doc = createDoc([], [], []);
    const manager = new LumiDocManager(doc);
    expect(manager.getSpanById('any-id')).to.be.undefined;
  });

  it('should correctly index spans from the abstract', () => {
    const abstractSpan = createSpan('abstract-span', 'This is the abstract.');
    const doc = createDoc([createTextContent([abstractSpan])], [], []);
    const manager = new LumiDocManager(doc);

    expect(manager.getSpanById('abstract-span')).to.deep.equal(abstractSpan);
  });

  it('should correctly index spans from nested list content', () => {
    const spanL1 = createSpan('list-span-1', 'List item 1');
    const spanL2 = createSpan('list-span-2', 'List item 2');
    const spanL2_1 = createSpan('list-span-2-1', 'Nested item 2.1');
    const spanL2_2 = createSpan('list-span-2-2', 'Nested item 2.2');

    const nestedList: ListContent = {
      listItems: [createListItem([spanL2_1]), createListItem([spanL2_2])],
      isOrdered: false,
    };

    const mainList = createListContent([
      createListItem([spanL1]),
      createListItem([spanL2], nestedList),
    ]);

    const doc = createDoc([], [createSection('s1', [mainList])], []);
    const manager = new LumiDocManager(doc);

    expect(manager.getSpanById('list-span-1')).to.deep.equal(spanL1);
    expect(manager.getSpanById('list-span-2')).to.deep.equal(spanL2);
    expect(manager.getSpanById('list-span-2-1')).to.deep.equal(spanL2_1);
    expect(manager.getSpanById('list-span-2-2')).to.deep.equal(spanL2_2);
  });

  it('should return the original LumiDoc object via the lumiDoc getter', () => {
    const doc = createDoc([], [], []);
    const manager = new LumiDocManager(doc);
    expect(manager.lumiDoc).to.deep.equal(doc);
  });

  it('should return all indexed span IDs via the spanIds getter', () => {
    const span1 = createSpan('span-1', 'Abstract');
    const span2 = createSpan('span-2', 'Section');
    const span3 = createSpan('span-3', 'Reference');
    const doc = createDoc(
      [createTextContent([span1])],
      [createSection('s1', [createTextContent([span2])])],
      [{ id: 'ref-1', span: span3 }]
    );
    const manager = new LumiDocManager(doc);

    const expectedIds = ['span-1', 'span-2', 'span-3'];
    expect(manager.spanIds.length).to.equal(expectedIds.length);
    expect(manager.spanIds).to.have.members(expectedIds);
  });

  describe('getSectionForSpan', () => {
    const span1 = createSpan('span-1', 'Top level');
    const span2 = createSpan('span-2', 'Nested');
    const span3 = createSpan('span-3', 'In a list');
    const abstractSpan = createSpan('abstract-span', 'Abstract');

    const subSection = createSection('sub-section', [
      createTextContent([span2]),
    ]);
    const topSection = createSection(
      'top-section',
      [
        createTextContent([span1]),
        createListContent([createListItem([span3])]),
      ],
      [subSection]
    );

    const doc = createDoc(
      [createTextContent([abstractSpan])],
      [topSection],
      []
    );
    const manager = new LumiDocManager(doc);

    it('should return the correct section for a span in a top-level section', () => {
      expect(manager.getSectionForSpan('span-1')).to.deep.equal(topSection);
    });

    it('should return the correct section for a span in a nested sub-section', () => {
      expect(manager.getSectionForSpan('span-2')).to.deep.equal(subSection);
    });

    it('should return the correct section for a span within a list that is inside a section', () => {
      expect(manager.getSectionForSpan('span-3')).to.deep.equal(topSection);
    });

    it('should return undefined for a span in the abstract', () => {
      expect(manager.getSectionForSpan('abstract-span')).to.be.undefined;
    });

    it('should return undefined for a non-existent span ID', () => {
      expect(manager.getSectionForSpan('non-existent-span')).to.be.undefined;
    });
  });

  describe('getParentSection', () => {
    const subSection = createSection('sub-section', []);
    const topSection = createSection('top-section', [], [subSection]);
    const anotherTopSection = createSection('another-top-section', []);

    const doc = createDoc([], [topSection, anotherTopSection], []);
    const manager = new LumiDocManager(doc);

    it('should return the correct parent section for a sub-section', () => {
      expect(manager.getParentSection('sub-section')).to.deep.equal(topSection);
    });

    it('should return undefined for a top-level section', () => {
      expect(manager.getParentSection('top-section')).to.be.undefined;
      expect(manager.getParentSection('another-top-section')).to.be.undefined;
    });

    it('should return undefined for a non-existent section ID', () => {
      expect(manager.getParentSection('non-existent-section')).to.be.undefined;
    });
  });
});
