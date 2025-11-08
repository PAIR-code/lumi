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

import '../components/overflow_menu/overflow_menu';

import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import { OverflowMenuProps } from '../services/floating_panel_service';

interface Args {
  props: OverflowMenuProps;
}

const meta: Meta<Args> = {
  title: 'Components/Overflow Menu',
  render: (args) =>
    html`<div style="width:200px;margin:12px;">
      <overflow-menu .props=${args.props}></overflow-menu>
    </div>`,
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  args: {
    props: new OverflowMenuProps([
      {
        icon: 'edit',
        label: 'Edit item',
        onClick: () => {
          console.log('Edit clicked');
        },
      },
      {
        icon: 'delete',
        label: 'Delete item',
        onClick: () => {
          console.log('Delete clicked');
        },
      },
      {
        label: 'Share',
        onClick: () => {
          console.log('Share clicked');
        },
      },
    ]),
  },
};
