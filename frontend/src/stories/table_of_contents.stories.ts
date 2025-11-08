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

import { html } from 'lit';

import { LumiSection } from '../shared/lumi_doc';

import '../components/table_of_contents/table_of_contents';

const mockSections: LumiSection[] = [
  {
    id: 'section-1',
    heading: { headingLevel: 1, text: 'Introduction' },
    contents: [],
    subSections: [
      {
        id: 'section-1.1',
        heading: { headingLevel: 2, text: 'Background' },
        contents: [],
      },
      {
        id: 'section-1.2',
        heading: { headingLevel: 2, text: 'Motivation' },
        contents: [],
        subSections: [
          {
            id: 'section-1.2.1',
            heading: { headingLevel: 3, text: 'Problem Statement' },
            contents: [],
          },
        ],
      },
    ],
  },
  {
    id: 'section-2',
    heading: { headingLevel: 1, text: 'Methods' },
    contents: [],
  },
  {
    id: 'section-3',
    heading: { headingLevel: 1, text: 'Results' },
    contents: [],
  },
];

export default {
  title: 'Table of Contents',
};

export const Default = () =>
  html`<table-of-contents
    .sections=${mockSections}
    .onSectionClicked=${(sectionId: string) => {
      console.log(`Section clicked: ${sectionId}`);
    }}
  ></table-of-contents>`;
