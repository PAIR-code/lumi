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
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { LumiConcept, LumiSpan } from "../../shared/lumi_doc";
import { getSelectionInfo, SelectionInfo } from "../../shared/selection_utils";
import { renderLumiSpan } from "../lumi_span/lumi_span_renderer";

import "../lumi_span/lumi_span";
import "../../pair-components/icon_button";

import { styles } from "./lumi_concept.scss";
import { styles as spanRendererStyles } from "../lumi_span/lumi_span_renderer.scss";

/**
 * Displays a Lumi Concept.
 */
@customElement("lumi-concept")
export class LumiConceptViz extends MobxLitElement {
  static override styles: CSSResultGroup = [styles, spanRendererStyles];

  @property({ type: Object }) concept!: LumiConcept;
  @property({ type: Object }) labelsToShow: string[] = [];
  @property() registerShadowRoot: (shadowRoot: ShadowRoot) => void = () => {};
  @property() unregisterShadowRoot: (shadowRoot: ShadowRoot) => void = () => {};

  @property({ type: Boolean }) isCollapsed = true;
  @property()
  setIsCollapsed: (isCollapsed: boolean) => void = () => {};

  private toggleCollapse() {
    this.setIsCollapsed(!this.isCollapsed);
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) {
      this.registerShadowRoot(this.shadowRoot);
    }
  }

  override disconnectedCallback() {
    if (this.shadowRoot) {
      this.unregisterShadowRoot(this.shadowRoot);
    }

    super.disconnectedCallback();
  }

  override render() {
    const icon = this.isCollapsed ? "chevron_right" : "expand_more";

    return html`
      <div class="header" @click=${this.toggleCollapse}>
        <pr-icon-button variant="default" .icon=${icon}></pr-icon-button>
        <h2 class="heading">${this.concept.name}</h2>
      </div>
      ${this.isCollapsed ? nothing : this.renderContents()}
    `;
  }

  private renderContents() {
    return this.concept.contents.map((content, index) => {
      if (!this.labelsToShow.includes(content.label)) return html``;

      const tempSpan: LumiSpan = {
        id: `${this.concept.name}-content-${index}`,
        text: content.value,
        innerTags: [],
      };

      const spanContent = renderLumiSpan({ span: tempSpan });

      return html`<div class="content">
        <lumi-span .span=${tempSpan} .noScrollContext=${true}
          >${spanContent}</lumi-span
        >
      </div>`;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-concept": LumiConceptViz;
  }
}
