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
import { classMap } from 'lit/directives/class-map.js';

import '../../pair-components/icon';

import { styles } from './multi_icon_toggle.scss';

export type Selection = 'collapsed' | 'indeterminate' | 'expanded';

/**
 * A three-icon toggle for managing collapse/expand all states.
 */
@customElement('multi-icon-toggle')
export class MultiIconToggle extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: String }) selection: Selection = 'collapsed';

  private readonly onCollapseAll = new Event('onCollapseAll');
  private readonly onExpandAll = new Event('onExpandAll');

  private handleCollapseAll() {
    this.dispatchEvent(this.onCollapseAll);
  }

  private handleExpandAll() {
    this.dispatchEvent(this.onExpandAll);
  }

  override render() {
    const collapseClasses = classMap({
      ['selected']: this.selection === 'collapsed',
      ['button-outer']: true,
      ['clickable']: true,
    });
    const indeterminateClasses = classMap({
      selected: this.selection === 'indeterminate',
      ['button-outer']: true,
    });
    const expandClasses = classMap({
      selected: this.selection === 'expanded',
      ['button-outer']: true,
      ['clickable']: true,
    });

    return html`
      <div class="container">
        <div class=${collapseClasses} @click=${this.handleCollapseAll}>
          <pr-icon
            icon="list"
            variant="default"
            title="Collapse into summaries"
          ></pr-icon>
        </div>
        <div class=${indeterminateClasses}>
          <pr-icon
            icon="check_indeterminate_small"
            variant="default"
            title="Mixed state"
            .disabled=${true}
          ></pr-icon>
        </div>
        <div class=${expandClasses} @click=${this.handleExpandAll}>
          <pr-icon
            icon="article"
            variant="default"
            title="Expand full paper"
          ></pr-icon>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'multi-icon-toggle': MultiIconToggle;
  }
}
