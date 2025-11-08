/**
 * Copyright 2024 Google LLC
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
import { styles } from './circular_progress.scss';
import type { ComponentColor, ComponentSize } from './types';

/**
 * A circular progress indicator component.
 */
@customElement('pr-circular-progress')
export class CircularProgress extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  @property({ type: String }) color: ComponentColor = 'primary';
  @property({ type: String }) size: ComponentSize = 'medium';

  override render() {
    const classes = classMap({
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
    });

    return html`
      <div class=${classes}>
        <span class="loading-spinner"></span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-circular-progress': CircularProgress;
  }
}
