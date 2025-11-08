/**
 * Copyright 2024 Google LLC
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
import { html } from 'lit';
import '../pair-components/circular_progress';
import { COMPONENT_COLORS, COMPONENT_SIZES } from '../pair-components/types';

const meta = {
  title: 'Components/CircularProgress',
  tags: ['autodocs'],
  render: (args) =>
    html`<div style="--pr-color: gray;">
      <pr-circular-progress size=${args.size}></pr-circular-progress>
    </div>`,
  argTypes: {
    size: {
      control: 'select',
      options: COMPONENT_SIZES,
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    size: 'medium',
  },
};
