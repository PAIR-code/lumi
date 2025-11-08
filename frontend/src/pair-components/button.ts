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
import type { ComponentColor, ComponentSize, ComponentVariant } from './types';

import { styles } from './button.scss';

type ButtonShape = 'default' | 'round';

/**
 * Text button.
 *
 * - Use "disabled" state when button should not be clickable
 *   (e.g., if it's a Save button and there are no unsaved changed)
 *
 * - Use "loading" state when button should not be clickable AND you want a
 *   loading spinner in place of the text
 *   (e.g., if it's a Save button and the content is currently saving)
 */
@customElement('pr-button')
export class Button extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;

  // Custom styles
  @property({ type: String }) color: ComponentColor = 'primary';
  @property({ type: String }) padding: ComponentSize = 'small';
  @property({ type: String }) shape: ButtonShape = 'default';
  @property({ type: String }) size: ComponentSize = 'small';
  @property({ type: String }) variant: ComponentVariant = 'filled';

  override render() {
    const classes = classMap({
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
      'padding-small': this.padding === 'small',
      'padding-medium': this.padding === 'medium',
      'padding-large': this.padding === 'large',
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
      'shape-round': this.shape === 'round',
      'variant-default': this.variant === 'default',
      'variant-filled': this.variant === 'filled',
      'variant-outlined': this.variant === 'outlined',
      'variant-tonal': this.variant === 'tonal',
    });

    const renderButtonContent = () => {
      return html`
        <div class="button-wrapper">
          <slot class="button-slot ${this.loading ? 'hidden' : ''}"></slot>
          <div class="loading-spinner-wrapper ${this.loading ? '' : 'hidden'}">
            <span class="loading-spinner"></span>
          </div>
        </div>
      `;
    };

    return html`
      <button
        type="button"
        ?disabled=${this.disabled || this.loading}
        class=${classes}
      >
        ${renderButtonContent()}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-button': Button;
  }
}
