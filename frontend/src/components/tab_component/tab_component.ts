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
import { styles } from './tab_component.scss';

@customElement('tab-component')
export class TabComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Array }) tabs: string[] = [];
  @property({ type: String }) selectedTab: string = '';

  render() {
    return html`
      <div class="tab-content">
        ${this.tabs.map(
          (tab) => html`
            <div class="tab-pane ${this.selectedTab === tab ? 'active' : ''}">
              <slot name=${tab}></slot>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tab-component': TabComponent;
  }
}
