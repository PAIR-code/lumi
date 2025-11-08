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
import { createRef, Ref, ref } from 'lit/directives/ref.js';

import { styles as sharedStyles } from './shared.scss';
import type { ComponentColor, ComponentSize, ComponentVariant } from './types';
import { getComponentClassName } from './utils';

import { styles } from './textarea.scss';
import { ifDefined } from 'lit/directives/if-defined.js';

function fitTextAreaToContent(
  textarea: HTMLElement,
  maxViewportHeight: number | undefined
) {
  // Measure height of textarea content
  textarea.style.height = `0px`;
  const fullHeight = textarea.scrollHeight;

  // Set height to match content height (or max viewport height)
  // NOTE: The .01 factor is to convert maxViewportHeight (e.g., 80vh) to
  //       a percentage (e.g., .80) of the window's inner height
  const height = maxViewportHeight
    ? Math.min(fullHeight, window.innerHeight * 0.01 * maxViewportHeight)
    : fullHeight;

  textarea.style.height = `${height}px`;
}

/**
 * Textarea
 */
@customElement('pr-textarea')
export class TextArea extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({ type: String }) label = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) focused = false;
  @property({ type: Boolean }) maxLength?: number;

  // Max height for the textarea in vh (e.g., 80 for 80vh max height)
  @property() maxViewportHeight: number | undefined = undefined;

  // Custom styles
  @property({ type: String }) color: ComponentColor = 'primary';
  @property({ type: String }) size: ComponentSize = 'small';
  @property({ type: String }) variant: ComponentVariant = 'default';

  textareaRef: Ref<Element> = createRef();
  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const textarea = entry.target as HTMLElement;
      fitTextAreaToContent(textarea, this.maxViewportHeight);
    });
  });

  override firstUpdated() {
    if (this.textareaRef?.value) {
      this.resizeObserver.observe(this.textareaRef.value);
    }
    if (this.focused) {
      this.focusElement();
    }
  }

  focusElement() {
    (this.renderRoot.querySelector('#textarea') as HTMLElement).focus();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (this.textareaRef?.value) {
      fitTextAreaToContent(
        this.textareaRef.value as HTMLElement,
        this.maxViewportHeight
      );
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.textareaRef?.value) {
      this.resizeObserver.unobserve(this.textareaRef.value);
    }
  }

  renderLabel() {
    const className = getComponentClassName('label-size', this.size);

    return this.label.length > 0
      ? html`<label for=${this.id} class=${className}>${this.label}</label>`
      : html``;
  }

  onChange(e: InputEvent) {
    const inputElement = e.target as HTMLInputElement;

    if (inputElement) {
      this.value = inputElement.value;

      const event = { detail: { value: inputElement.value } };
      this.dispatchEvent(new CustomEvent('change', event));
    }
  }

  onKeydown(e: KeyboardEvent) {
    const event = { detail: { key: e.key } };
    this.dispatchEvent(new CustomEvent('keydown', event));
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
      'variant-default': this.variant === 'default',
      'variant-outlined': this.variant === 'outlined',
    });

    return html`
      ${this.renderLabel()}
      <div class="textarea-wrapper">
        <textarea
          id="textarea"
          ${ref(this.textareaRef)}
          class=${classes}
          ?disabled=${this.disabled}
          type="text"
          .maxLength=${ifDefined(this.maxLength)}
          placeholder=${this.placeholder}
          .value=${this.value}
          @input=${this.onChange}
          @keydown=${this.onKeydown}
        ></textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-textarea': TextArea;
  }
}
