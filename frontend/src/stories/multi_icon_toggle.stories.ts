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

import '../components/multi_icon_toggle/multi_icon_toggle';

const meta = {
  title: 'Components/MultiIconToggle',
  tags: ['autodocs'],
  render: (args) =>
    html`<multi-icon-toggle
      .selection=${args.selection}
      @onCollapseAll=${args.onCollapseAll}
      @onExpandAll=${args.onExpandAll}
    ></multi-icon-toggle>`,
  argTypes: {
    selection: {
      control: { type: 'radio' },
      options: ['collapsed', 'indeterminate', 'expanded'],
    },
  },
  args: {
    onCollapseAll: fn(() => console.log('onCollapseAll')),
    onExpandAll: fn(() => console.log('onExpandAll')),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    selection: 'indeterminate',
  },
};

export const Collapsed: Story = {
  args: {
    selection: 'collapsed',
  },
};

export const Expanded: Story = {
  args: {
    selection: 'expanded',
  },
};
