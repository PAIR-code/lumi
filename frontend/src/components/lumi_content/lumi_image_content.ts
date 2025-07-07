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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

import { ImageContent } from "../../shared/lumi_doc";
import "../lumi_span/lumi_span";

import { styles } from "./lumi_image_content.scss";
import { renderLumiSpan } from "../lumi_span/lumi_span_renderer";

/**
 * An image visualization in the Lumi visualization.
 */
@customElement("lumi-image-content")
export class LumiImageContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) imageContent!: ImageContent;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;

  @state() private imageUrl: string | null = null;

  private async fetchImageUrl() {
    if (this.getImageUrl && this.imageContent.storagePath) {
      this.imageUrl = await this.getImageUrl(this.imageContent.storagePath);
    } else {
      this.imageUrl = null;
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("imageContent") ||
      changedProperties.has("getImageUrl")
    ) {
      this.fetchImageUrl();
    }
  }

  private renderCaption(): TemplateResult | typeof nothing {
    if (!this.imageContent.caption) {
      return nothing;
    }
    return html`
      <figcaption>
        <lumi-span .span=${this.imageContent.caption}
          >${renderLumiSpan({ span: this.imageContent.caption })}</lumi-span
        >
      </figcaption>
    `;
  }

  override render() {
    return html` <div class="image-container">
      <img src=${ifDefined(this.imageUrl ?? undefined)} />
      ${this.renderCaption()}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-image-content": LumiImageContent;
  }
}
