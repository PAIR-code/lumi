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

import { fn } from "@storybook/test";

import type { Meta, StoryObj } from "@storybook/web-components";

import { html } from "lit";

import "../components/gallery/gallery_card";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: "Components/GalleryCard",
  tags: ["autodocs"],
  render: (args) =>
    html`<gallery-card
      .item=${{
        title: args.title,
        description: args.description,
        creator: args.creator,
        date: args.date,
        version: args.version,
        isPublic: args.isPublic,
        isStarred: args.isStarred,
        tags: Array.from(Array(args.tagCount).keys()).map(
          (value) => args.tagName
        ),
      }}
    ></gallery-card>`,
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    creator: { control: "text" },
    date: { control: "text" },
    version: { control: "number" },
    isPublic: { control: "boolean" },
    isStarred: { control: "boolean" },
    tagName: { control: "text" },
    tagCount: { control: "number" },
  },
  args: { onClick: fn() },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    title: "My Gallery Card",
    description: "Description of card",
    creator: "Lumi",
    date: "May 1",
    version: 1,
    isPublic: true,
    isStarred: false,
    tagName: ["tag"],
    tagCount: 1,
  },
};
