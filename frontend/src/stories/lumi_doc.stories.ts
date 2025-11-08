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

import type { Meta, StoryObj } from '@storybook/web-components';

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

// Run the main_import_pdf_script.py to import a paper to use locally.
// import { paper as paper_xxxx_xxxxx } from "../.examples/paper_xxxx.xxxxx";

import '../components/lumi_doc/lumi_doc';
import { InnerTagName, LumiDoc, LoadingStatus } from '../shared/lumi_doc';
import { scrollContext, ScrollState } from '../contexts/scroll_context';
import { Ref } from 'lit/directives/ref';
import { LumiDocManager } from '../shared/lumi_doc_manager';
import { CollapseManager } from '../shared/collapse_manager';
import { HighlightManager } from '../shared/highlight_manager';

const PAPERS: { [key: string]: LumiDoc } = {
  // "xxxx.xxxxx": paper_xxxx_xxxxx,
};

const TEST_TABLE_HTML = `<table>
  <tr>
    <th>Company $a_2$</th>
    <th>Contact</th>
    <th>Country</th>
  </tr>
  <tr>
    <td>Alfreds Futterkiste</td>
    <td>Maria Anders</td>
    <td>Germany</td>
  </tr>
  <tr>
    <td>Centro comercial Moctezuma</td>
    <td>Francisco Chang</td>
    <td>Mexico</td>
  </tr>
</table>`;

const mockLumiDoc: LumiDoc = {
  markdown: '',
  loadingStatus: LoadingStatus.SUCCESS,
  metadata: {
    title: 'Mock Document for Testing',
    authors: ['John Doe', 'Jill Smith'],
    paperId: 'mock-id',
    version: '1',
    summary: 'A mock document.',
    updatedTimestamp: '',
    publishedTimestamp: '',
  },
  abstract: {
    contents: [
      {
        id: 'abstract_content_1_1',
        textContent: {
          tagName: 'p',
          spans: [
            {
              id: 'abstract_span_1_1_1',
              text: 'This is the first sentence in the abstract. ',
              innerTags: [
                {
                  tagName: InnerTagName.FOOTNOTE,
                  position: {
                    startIndex: 4,
                    endIndex: 4,
                  },
                  metadata: {
                    id: '1',
                  },
                },
              ],
            },
            {
              id: 'abstract_span_1_1_2',
              text: 'This is the second sentence in the abstract. ',
              innerTags: [],
            },
          ],
        },
        imageContent: null,
        htmlFigureContent: null,
        listContent: null,
        figureContent: null,
      },
    ],
  },
  concepts: [],
  footnotes: [
    {
      id: '1',
      span: {
        id: 'footnote_span_1',
        text: 'What a footnote would say',
        innerTags: [],
      },
    },
  ],
  references: [
    {
      id: 'ref_1',
      span: { id: 'ref_span_1', text: '[1] A. N. Author', innerTags: [] },
    },
  ],
  summaries: {
    abstractExcerptSpanId: 'abstract_span_1_1_1',
    sectionSummaries: [
      {
        id: 'section_1',
        summary: { id: 's_sum_1', text: 'This is section 1.', innerTags: [] },
      },
    ],
    contentSummaries: [
      {
        id: 'content_1_1',
        summary: {
          id: 'c_sum_1',
          text: 'This is a paragraph summary.',
          innerTags: [],
        },
      },
    ],
    spanSummaries: [
      {
        id: 'span_1_1_1',
        summary: {
          id: 'sp_sum_1',
          text: 'This is a span summary.',
          innerTags: [],
        },
      },
    ],
  },
  sections: [
    {
      id: 'section_1',
      heading: { headingLevel: 2, text: 'First Section' },
      contents: [
        {
          id: 'content_1_1',
          textContent: {
            tagName: 'p',
            spans: [
              {
                id: 'span_1_1_1',
                // Reference
                text: 'This is the first sentence with a reference [1]. ',
                innerTags: [
                  {
                    tagName: InnerTagName.REFERENCE,
                    position: { startIndex: 43, endIndex: 46 },
                    metadata: { referenceId: 'ref_1' },
                  },
                ],
              },
              {
                id: 'span_1_1_2',
                text: 'This is the second sentence.',
                innerTags: [],
              },
            ],
          },
          imageContent: null,
          htmlFigureContent: null,
          listContent: null,
          figureContent: null,
        },
      ],
    },
    {
      id: 'section_2',
      heading: { headingLevel: 2, text: 'Different content types' },
      contents: [
        // List content
        {
          id: 'content_2_1',
          listContent: {
            isOrdered: false,
            listItems: [
              { spans: [{ id: 'li_1', text: 'Item 1', innerTags: [] }] },
              { spans: [{ id: 'li_2', text: 'Item 2', innerTags: [] }] },
            ],
          },
          textContent: null,
          imageContent: null,
          htmlFigureContent: null,
          figureContent: null,
        },
        // Pre content
        {
          id: 'content_2_2',
          textContent: {
            tagName: 'pre',
            spans: [
              {
                id: 'code_1',
                text: "const x = 'hello world';",
                innerTags: [],
              },
            ],
          },
          imageContent: null,
          htmlFigureContent: null,
          listContent: null,
          figureContent: null,
        },
        // HTML figure content
        {
          id: 'content_2_3',
          listContent: null,
          textContent: null,
          imageContent: null,
          htmlFigureContent: {
            html: TEST_TABLE_HTML,
            caption: {
              text: 'Example html figure caption',
              id: 'html_caption_span_id',
              innerTags: [],
            },
          },
          figureContent: null,
        },
        // Image content
        {
          id: 'content_2_4',
          listContent: null,
          textContent: null,
          htmlFigureContent: null,
          figureContent: null,
          imageContent: {
            storagePath: 'lollipop.png',
            latexPath: '',
            altText: '',
            width: 100,
            height: 100,
            caption: {
              text: 'Example image caption',
              id: 'image_caption_span_id',
              innerTags: [],
            },
          },
        },
      ],
    },
  ],
};

class MockScrollState extends ScrollState {
  registerSpan = (id: string, el: Ref) => {};
  unregisterSpan = (id: string) => {};
  scrollToSpan = (id: string) => {};
}

/**
 * A mock provider for the scroll context, for use in Storybook.
 */
@customElement('mock-scroll-provider')
class MockScrollProvider extends LitElement {
  @provide({ context: scrollContext })
  @state()
  private scrollContext: ScrollState = new MockScrollState();

  override render() {
    return html`<slot></slot>`;
  }
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'Components/LumiDoc',
  tags: ['autodocs'],
  render: (args) => {
    const lumiDocManager = new LumiDocManager(args.lumiDoc);
    const collapseManager = new CollapseManager(lumiDocManager);
    const highlightManager = new HighlightManager();
    collapseManager.initialize();

    return html` <mock-scroll-provider>
      <lumi-doc
        .lumiDocManager=${lumiDocManager}
        .highlightManager=${highlightManager}
        .collapseManager=${collapseManager}
        .getImageUrl=${(path: string) => Promise.resolve(`/${path}`)}
      ></lumi-doc>
    </mock-scroll-provider>`;
  },
  argTypes: {
    paper: {
      options: Object.keys(PAPERS),
      mapping: PAPERS,
      control: { type: 'select' },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    lumiDoc: mockLumiDoc,
  },
};

export const UsingImportedPaper: Story = {
  args: {
    paper: Object.keys(PAPERS)[0],
  },
  render: (args) => {
    const lumiDoc = args.paper;

    if (!lumiDoc) {
      return html`<p>
        No imported paper found. (These may be commented out in the story.)
      </p>`;
    }
    return meta.render({ ...args, lumiDoc });
  },
};

declare global {
  interface HTMLElementTagNameMap {
    'mock-scroll-provider': MockScrollProvider;
  }
}
