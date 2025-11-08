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

import { CSSResultGroup, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { styles as sharedStyles } from './shared.scss';
import type { ComponentColor, ComponentSize } from './types';

import { styles } from './icon.scss';

/**
 * Material Symbols Outilned icon
 */
@customElement('pr-icon')
export class Icon extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({ type: Boolean }) filled = false;
  @property({ type: String }) icon = 'favorite';

  // Custom styles
  @property({ type: String }) color: ComponentColor = 'primary';
  @property({ type: String }) size: ComponentSize = 'medium';

  override render() {
    const classes = classMap({
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
      icon: true,
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
      'palette-success': this.color === 'success',
      'state-filled': this.filled,
    });

    return html`<span class=${classes}>${this.icon}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-icon': Icon;
  }
}
