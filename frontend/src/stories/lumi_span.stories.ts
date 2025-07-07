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
import type { Args, Meta, StoryObj } from "@storybook/web-components";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { FocusState } from "../shared/types";
import { InnerTagName, LumiSpan } from "../shared/lumi_doc";
import { renderLumiSpan } from "../components/lumi_span/lumi_span_renderer";
import { styles as spanRendererStyles } from "../components/lumi_span/lumi_span_renderer.scss";

import "../components/lumi_span/lumi_span";

// Use a mock parent to import the span renderer styles.
@customElement("mock-span-parent")
class MockSpanParent extends LitElement {
  static override styles: CSSResultGroup = [spanRendererStyles];
  @property() span!: LumiSpan;
  @property() args!: Args;

  override render() {
    return html`<lumi-span
      .span=${this.span}
      .onReferenceClick=${this.args.onReferenceClick}
      .label=${this.args.label}
      .focusState=${this.args.focusState}
      .classMap=${this.args.classMap}
      >${renderLumiSpan({
        span: this.span,
        onReferenceClicked: this.args.onReferenceClick,
        highlights: this.args.highlights,
      })}</lumi-span
    >`;
  }
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: "Components/LumiSpan",
  tags: ["autodocs"],
  render: (args) => {
    const span: LumiSpan = {
      id: "span_id",
      text: args.text,
      innerTags: args.innerTags,
    };
    return html`<mock-span-parent
      .args=${args}
      .span=${span}
    ></mock-span-parent>`;
  },
  args: { onReferenceClick: fn() },
  argTypes: {
    text: { control: "text" },
    innerTags: {},
    highlights: {},
    classMap: { control: "object" },
    label: { control: "text" },
    focusState: { control: "radio", options: Object.values(FocusState) },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    text: "test span",
    label: "label",
    innerTags: [],
    focusState: FocusState.DEFAULT,
  },
};

export const Focused: Story = {
  args: {
    text: "This span is focused.",
    label: "focused",
    innerTags: [],
    focusState: FocusState.FOCUSED,
  },
};

export const Unfocused: Story = {
  args: {
    text: "This span is unfocused.",
    label: "unfocused",
    innerTags: [],
    focusState: FocusState.UNFOCUSED,
  },
};

export const StyledWithClass: Story = {
  args: {
    text: "This span is styled with a class. (Can be seen in inspector)",
    label: "styled",
    innerTags: [],
    classMap: { "styled-with-class": true },
  },
};

export const Latex: Story = {
  args: {
    text: "z = (z_1, ..., z_n) is my equation. Here is a fraction \\frac12",
    innerTags: [
      {
        tagName: InnerTagName.MATH,
        position: { startIndex: 0, endIndex: 19 },
        metadata: {},
      },
      {
        tagName: InnerTagName.MATH,
        position: { startIndex: 55, endIndex: 62 },
        metadata: {},
      },
    ],
    label: "label",
  },
};

export const LatexSqrt: Story = {
  args: {
    text: "Here is a sqrt: \\sqrt{x}",
    innerTags: [
      {
        tagName: InnerTagName.MATH,
        position: { startIndex: 16, endIndex: 23 },
        metadata: {},
      },
    ],
    label: "label",
  },
};

export const BoldAndItalic: Story = {
  args: {
    text: "Here are bold and italic words.",
    innerTags: [
      {
        tagName: InnerTagName.BOLD,
        position: { startIndex: 8, endIndex: 13 },
        metadata: {},
      },
      {
        tagName: InnerTagName.ITALIC,
        position: { startIndex: 18, endIndex: 24 },
        metadata: {},
      },
    ],
  },
};

export const Reference: Story = {
  args: {
    text: "This is a sentence. [1, 12]",
    onReferenceClick: (referenceId: string) => {
      console.log(referenceId);
    },
    innerTags: [
      {
        tagName: InnerTagName.REFERENCE,
        position: { startIndex: 21, endIndex: 22 },
        metadata: {
          id: "reference_1_id",
        },
      },
      {
        tagName: InnerTagName.REFERENCE,
        position: { startIndex: 24, endIndex: 26 },
        metadata: {
          id: "reference_2_id",
        },
      },
    ],
  },
};

export const Link: Story = {
  args: {
    text: "This is a link to Google.",
    innerTags: [
      {
        tagName: InnerTagName.A,
        position: { startIndex: 10, endIndex: 13 },
        metadata: {
          href: "https://www.google.com",
        },
      },
    ],
  },
};

export const Code: Story = {
  args: {
    text: "This is some inline code.",
    innerTags: [
      {
        tagName: InnerTagName.CODE,
        position: { startIndex: 13, endIndex: 24 },
        metadata: {},
      },
    ],
  },
};

export const Highlight: Story = {
  args: {
    text: "This is some highlighted code.",
    highlights: [
      {
        color: "cyan",
        spanId: "span_id",
        position: {
          startIndex: 13,
          endIndex: 24,
        },
      },
    ],
    innerTags: [],
  },
};

declare global {
  interface HTMLElementTagNameMap {
    "mock-span-parent": MockSpanParent;
  }
}
