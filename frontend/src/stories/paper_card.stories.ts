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

import { fn } from '@storybook/test';

import type { Meta, StoryObj } from '@storybook/web-components';

import { html } from 'lit';

import '../components/gallery/home_gallery';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'Components/PaperCard',
  tags: ['autodocs'],
  render: (args) =>
    html`<paper-card
      .metadata=${{
        title: args.title,
        summary: args.summary,
        authors: args.authors,
        publishedTimestamp: args.publishedTimestamp,
        updatedTimestamp: args.updatedTimestamp,
        version: args.version,
        paperId: args.paperId,
      }}
      .status=${args.status}
    ></paper-card>`,
  argTypes: {
    title: { control: 'text' },
    summary: { control: 'text' },
    authors: { control: 'text' },
    publishedTimestamp: { control: 'text' },
    updatededTimestamp: { control: 'text' },
    version: { control: 'number' },
    paperId: { control: 'text' },
    status: { control: 'text' },
  },
  args: { onClick: fn() },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    title: 'Headscarf drosera bell cardamom backwards lemon custard',
    summary:
      'Pilot pumpernickel ginger prunus crown grits slushie half-moons black tee scarf. Pinguicula fuzzy jacket potato chips pepper malvaceae macaroon.',
    authors: 'Cashew, Biscuit',
    version: '1',
    updatedTimestamp: '',
    publishedTimestamp: '',
    paperId: 'my-paper-id',
  },
};
