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
import { getComponentClassName } from './utils';

import { styles } from './textinput.scss';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * Text input
 */
@customElement('pr-textinput')
export class TextInput extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({ type: String }) label = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) maxLength?: number;
  @property({ type: Object }) onChange = (e: InputEvent) => {};
  @property({ type: Object }) onKeydown = (e: KeyboardEvent) => {};

  // Custom styles
  @property({ type: String }) color: ComponentColor = 'primary';
  @property({ type: String }) size: ComponentSize = 'small';

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  renderLabel() {
    const sizeClass = getComponentClassName('label-size', this.size);
    return this.label.length > 0
      ? html`<label class=${sizeClass} for=${this.id}>${this.label}</label>`
      : html``;
  }

  override render() {
    const classes = classMap({
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
    });
    return html` ${this.renderLabel()}
      <input
        id=${this.id}
        class="${classes}"
        ?disabled=${this.disabled}
        type="text"
        placeholder=${this.placeholder}
        .value=${this.value}
        .maxLength=${ifDefined(this.maxLength)}
        @keydown=${this.onKeydown}
        @input=${this.onChange}
      />`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-textinput': TextInput;
  }
}
