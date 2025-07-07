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

import { MobxLitElement } from "@adobe/lit-mobx";
import { css, CSSResultGroup, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { consume } from "@lit/context";

import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import { FocusState } from "../../shared/types";
import { LumiSpan } from "../../shared/lumi_doc";

import { classMap } from "lit/directives/class-map.js";

import { styles } from "./lumi_span.scss";
import { styles as rendererStyles } from "./lumi_span_renderer.scss";

/**
 * A span visualization in the Lumi visualization.
 *
 * This component is a simple wrapper that applies some styles and provides a
 * <slot> for its content. The actual rendering of the span's text and inner
 * tags is handled by the `renderLumiSpan` function in `lumi_span_renderer.ts`.
 * This is done to keep the rendered text in the Light DOM of the parent
 * component (`lumi-doc`), which is necessary for `window.getSelection()` to
 * work correctly across component boundaries.
 */
@customElement("lumi-span")
export class LumiSpanViz extends MobxLitElement {
  static override styles: CSSResultGroup = [
    styles,
    rendererStyles,
    css`
      :host {
        display: inline;
        position: relative;
      }
    `,
  ];

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  private spanRef: Ref<HTMLSpanElement> = createRef();

  @property({ type: Object }) span!: LumiSpan;

  @property({ type: Boolean }) monospace = false;
  @property({ type: String }) focusState = FocusState.DEFAULT;
  @property({ type: Object }) classMap: { [key: string]: boolean } = {};

  // Can be passed if this span should be excluded from the scroll context.
  @property({ type: Boolean }) noScrollContext = false;

  override firstUpdated(_changedProperties: PropertyValues): void {
    this.id = this.span.id;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.noScrollContext) return;

    this.updateComplete.then(() => {
      if (this.spanRef.value && this.span) {
        this.scrollContext?.registerSpan(this.span.id, this.spanRef);
      }
    });
  }

  override disconnectedCallback() {
    if (this.span && !this.noScrollContext) {
      this.scrollContext?.unregisterSpan(this.span.id);
    }
    super.disconnectedCallback();
  }

  private getSpanClassesObject() {
    const classesObject: { [key: string]: boolean } = {
      "outer-span": true,
      monospace: this.monospace,
      focused: this.focusState === FocusState.FOCUSED,
      unfocused: this.focusState === FocusState.UNFOCUSED,
      ...this.classMap,
    };
    return classesObject;
  }

  override render() {
    return html`
      <span
        ${ref(this.spanRef)}
        id=${this.span.id}
        class=${classMap(this.getSpanClassesObject())}
      >
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-span": LumiSpanViz;
  }
}
