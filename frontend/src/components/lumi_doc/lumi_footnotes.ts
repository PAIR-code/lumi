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

import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LumiFootnote } from '../../shared/lumi_doc';
import { LumiFont } from '../../shared/types';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { styles } from './lumi_footnotes.scss';

import '../lumi_span/lumi_span';
import '../../pair-components/icon_button';

@customElement('lumi-footnotes')
export class LumiFootnotes extends LightMobxLitElement {
  @property({ type: Array }) footnotes: LumiFootnote[] = [];
  @property({ type: Boolean }) isCollapsed = false;
  @property({ type: Object }) onCollapseChange: (isCollapsed: boolean) => void =
    () => {};

  private renderFootnote(footnote: LumiFootnote, index: number) {
    return html`<div class="footnote-item">
      <span class="footnote-index">${index + 1}.</span>
      <lumi-span
        .span=${footnote.span}
        .font=${LumiFont.PAPER_TEXT}
      ></lumi-span>
    </div>`;
  }

  override render() {
    if (!this.footnotes || this.footnotes.length === 0) {
      return nothing;
    }

    return html`
      <style>
        ${styles}
      </style>
      <div class="footnotes-renderer-container">
        <div class="footnotes">
          <h2 class="footnotes-header">
            <pr-icon-button
              variant="default"
              @click=${() => {
                this.onCollapseChange(!this.isCollapsed);
              }}
              .icon=${this.isCollapsed
                ? 'chevron_right'
                : 'keyboard_arrow_down'}
            ></pr-icon-button>
            Footnotes
          </h2>
          ${this.isCollapsed
            ? nothing
            : this.footnotes.map((footnote, index) =>
                this.renderFootnote(footnote, index)
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-footnotes': LumiFootnotes;
  }
}
