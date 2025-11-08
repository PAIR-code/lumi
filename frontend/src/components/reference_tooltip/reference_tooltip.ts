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
import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { ReferenceTooltipProps } from '../../services/floating_panel_service';
import '../lumi_span/lumi_span';

import { styles } from './reference_tooltip.scss';

/**
 * A component that renders a reference in a tooltip.
 */
@customElement('reference-tooltip')
export class ReferenceTooltip extends MobxLitElement {
  static override styles = [styles];

  @property({ type: Object }) props!: ReferenceTooltipProps;

  override render() {
    if (!this.props?.reference) {
      return html``;
    }

    const referenceContent = this.props.reference.span;

    return html`<div class="reference-tooltip-component">
      <lumi-span .span=${referenceContent}></lumi-span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reference-tooltip': ReferenceTooltip;
  }
}
