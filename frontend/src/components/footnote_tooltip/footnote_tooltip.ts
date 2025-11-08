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

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FootnoteTooltipProps } from '../../services/floating_panel_service';
import { styles } from './footnote_tooltip.scss';

import '../lumi_span/lumi_span';

/**
 * A tooltip component to display information about a LumiFootnote.
 */
@customElement('footnote-tooltip')
export class FootnoteTooltip extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) props!: FootnoteTooltipProps;

  override render() {
    if (!this.props?.footnote) {
      return nothing;
    }

    const { footnote } = this.props;

    return html`
      <div class="footnote-tooltip-component">
        <lumi-span .span=${footnote.span}></lumi-span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'footnote-tooltip': FootnoteTooltip;
  }
}
