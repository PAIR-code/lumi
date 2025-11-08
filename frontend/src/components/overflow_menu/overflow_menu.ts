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

import '../../pair-components/icon';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import {
  OverflowMenuItem,
  OverflowMenuProps,
} from '../../services/floating_panel_service';
import { styles } from './overflow_menu.scss';

/**
 * A component that renders a list of menu items for an overflow menu.
 */
@customElement('overflow-menu')
export class OverflowMenu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() props!: OverflowMenuProps;

  private handleItemClick(item: OverflowMenuItem) {
    item.onClick();
  }

  override render() {
    return html`
      ${map(
        this.props.items,
        (item) => html`
          <div
            class="menu-item"
            @click=${() => void this.handleItemClick(item)}
          >
            <pr-icon .icon=${item.icon}></pr-icon>
            <span class="label">${item.label}</span>
          </div>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'overflow-menu': OverflowMenu;
  }
}
