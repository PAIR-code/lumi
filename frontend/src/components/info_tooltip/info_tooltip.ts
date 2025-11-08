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
import { CSSResultGroup, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { InfoTooltipProps } from '../../services/floating_panel_service';
import { styles } from './info_tooltip.scss';

/**
 * A tooltip component for displaying informational text.
 */
@customElement('info-tooltip')
export class InfoTooltip extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ attribute: false }) props!: InfoTooltipProps;

  override render() {
    return html`${this.props.text}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'info-tooltip': InfoTooltip;
  }
}
