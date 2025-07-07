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

import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { HomeService } from "../../services/home.service";

import { GalleryItem } from "../../shared/types";

import { styles } from "./gallery_card.scss";

/** Gallery card */
@customElement("gallery-card")
export class GalleryCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly homeService = core.getService(HomeService);

  @property() item: GalleryItem | null = null;
  @property({ type: Boolean }) disabled = false;

  override render() {
    if (!this.item) {
      return nothing;
    }

    const classes = { "gallery-card": true, disabled: this.disabled };

    return html`
      <div class=${classMap(classes)}>
        <div class="gallery-card-inner">
          <div class="header">
            <div class="title">${this.item.title}</div>
            <div class="right"></div>
          </div>
          <div class="description">${this.item.description}</div>
          <div class="footer">
            <div>${this.item.creator}</div>
            <div>${this.item.date}</div>
            <div>${this.item.tags.join(" ")}</div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gallery-card": GalleryCard;
  }
}
