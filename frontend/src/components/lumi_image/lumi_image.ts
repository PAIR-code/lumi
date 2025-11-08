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
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { classMap } from 'lit/directives/class-map.js';
import { styles } from './lumi_image.scss';
import { makeObservable, observable } from 'mobx';

/**
 * A reusable component for loading and displaying images with loading and error
 * states.
 */
@customElement('lumi-image')
export class LumiImage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: String }) storagePath = '';
  @property({ type: String }) altText?: string;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property({ type: Object }) onImageClick?: (e: MouseEvent) => void;
  @property({ type: Boolean }) highlighted = false;
  @property({ type: Boolean }) enableHover = false;

  @observable private imageUrl: string | null = null;
  @state() private isLoading = true;
  @state() private hasError = false;

  constructor() {
    super();
    makeObservable(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('storagePath')) {
      this.fetchImageUrl();
    }
  }

  private async fetchImageUrl() {
    if (!this.getImageUrl || !this.storagePath) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.imageUrl = null;

    try {
      const url = await this.getImageUrl(this.storagePath);
      this.imageUrl = url;
    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  private renderLoading() {
    return html`<div class="loading-image-placeholder"></div>`;
  }

  private renderError() {
    return html`<div class="image-error-placeholder">Error loading image</div>`;
  }

  override render() {
    if (this.isLoading) {
      return this.renderLoading();
    }

    if (this.hasError || this.imageUrl == null) {
      return this.renderError();
    }

    const containerClasses = classMap({
      'image-container': true,
      highlighted: this.highlighted,
      'enable-hover': this.enableHover,
    });

    return html`
      <div
        class=${containerClasses}
        @click=${(e: MouseEvent) => {
          if (this.onImageClick) {
            this.onImageClick(e);
          }
        }}
      >
        <img
          src=${ifDefined(this.imageUrl)}
          alt=${ifDefined(this.altText)}
          title=${this.title}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-image': LumiImage;
  }
}
