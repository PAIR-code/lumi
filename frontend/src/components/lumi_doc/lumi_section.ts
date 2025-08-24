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

import { CSSResultGroup, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { consume } from "@lit/context";

import { scrollContext, ScrollState } from "../../contexts/scroll_context";
import { FocusState } from "../../shared/types";
import { LumiSection } from "../../shared/lumi_doc";

import { styles } from "./lumi_section.scss";
import { LightMobxLitElement } from "../light_mobx_lit_element/light_mobx_lit_element";
import {
  renderSection,
  SectionRendererProperties,
} from "./renderers/section_renderer";

/**
 * Displays a lumi section
 *
 * This component is a simple wrapper that applies some styles and provides a
 * <slot> for its content. The actual rendering of the section's text and inner
 * tags is handled by the `renderLumiSection` function in `lumi_section_renderer.ts`.
 * This is done to keep the rendered text in the Light DOM of the parent
 * component (`lumi-doc`), which is necessary for `window.getSelection()` to
 * work correctly across component boundaries.
 */
@customElement("lumi-section")
export class LumiSectionViz extends LightMobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  private sectionRef: Ref<HTMLElement> = createRef();

  @property({ type: Object }) section!: LumiSection;
  @property({ type: Object }) sectionProperties!: SectionRendererProperties;

  override firstUpdated(_changedProperties: PropertyValues): void {
    this.id = this.section.id;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete.then(() => {
      if (this.sectionRef.value && this.section) {
        this.scrollContext?.registerSection(this.section.id, this.sectionRef);
      }
    });
  }

  override disconnectedCallback() {
    if (this.section) {
      this.scrollContext?.unregisterSection(this.section.id);
    }
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div
        ${ref(this.sectionRef)}
        id=${this.section.id}
        class="section-ref-container"
      >
        ${renderSection(this.sectionProperties)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-section": LumiSectionViz;
  }
}
