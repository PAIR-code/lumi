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
import '../../pair-components/icon_button';

import { MobxLitElement } from '@adobe/lit-mobx';
import { html, nothing, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { styles } from './banner.scss';
import { classMap } from 'lit/directives/class-map.js';

export const BANNER_HEIGHT = 40;

/**
 * Renders a banner.
 */
@customElement('lumi-banner')
export class LumiBanner extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: String }) text: string | string[] = '';
  @property({ type: String }) icon = '';
  @property({ type: String }) actionText = '';
  @property({ type: Object }) actionCallback = () => {};
  @property({ type: Object }) onBannerClose: (() => void) | undefined =
    undefined;

  override render() {
    const hostStyles = styleMap({
      height: `${BANNER_HEIGHT}px`,
    });

    const bannerClasses = classMap({
      banner: true,
      'justify-center': this.onBannerClose == null,
    });

    return html`
      <div class=${bannerClasses} style=${hostStyles}>
        <div class="main-message">
          ${this.renderIcon()}
          <span class="text" title=${this.text}>${this.text}</span>
          ${this.renderActionButton()}
        </div>
        ${this.renderCloseIcon()}
      </div>
    `;
  }

  private renderIcon() {
    if (!this.icon) {
      return nothing;
    }
    return html`<pr-icon
      color="neutral"
      class="icon"
      icon=${this.icon}
    ></pr-icon>`;
  }

  private renderActionButton() {
    if (!this.actionText || !this.actionCallback) {
      return nothing;
    }
    return html`
      <pr-button variant="default" @click=${this.actionCallback}>
        ${this.actionText}
      </pr-button>
    `;
  }

  private renderCloseIcon() {
    if (!this.onBannerClose) {
      return nothing;
    }

    return html`
      <pr-icon-button
        class="close-button"
        icon="close"
        variant="default"
        @click=${this.onBannerClose}
      ></pr-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-banner': LumiBanner;
  }
}
