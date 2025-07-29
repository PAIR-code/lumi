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

import { FigureContent, ImageContent, LumiSpan } from "../../shared/lumi_doc";
import "../lumi_span/lumi_span";

import { styles } from "./lumi_image_content.scss";
import { renderLumiSpan } from "../lumi_span/lumi_span_renderer";
import { makeObservable, observable } from "mobx";
import { classMap } from "lit/directives/class-map.js";

function isFigureContent(
  content: ImageContent | FigureContent
): content is FigureContent {
  return "images" in content;
}

/**
 * An image visualization in the Lumi visualization.
 * Can render a single image or a group of subfigures.
 */
@customElement("lumi-image-content")
export class LumiImageContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) content!: ImageContent | FigureContent;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;

  @observable.shallow private imageUrls = new Map<string, string>();
  @state() private isLoading = true;

  constructor() {
    super();
    makeObservable(this);
  }

  private async fetchImageUrls() {
    if (!this.getImageUrl || !this.content) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    this.imageUrls.clear();
    const imageContents = isFigureContent(this.content)
      ? this.content.images
      : [this.content];

    await Promise.all(
      imageContents.map(async (image) => {
        if (image.storagePath) {
          const url = await this.getImageUrl!(image.storagePath);
          this.imageUrls.set(image.storagePath, url);
        }
      })
    );

    this.isLoading = false;
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("content") ||
      changedProperties.has("getImageUrl")
    ) {
      this.fetchImageUrls();
    }
  }

  private renderCaption(
    caption?: LumiSpan | null
  ): TemplateResult | typeof nothing {
    if (!caption) {
      return nothing;
    }
    return html`
      <figcaption>
        <lumi-span .span=${caption}
          >${renderLumiSpan({ span: caption })}</lumi-span
        >
      </figcaption>
    `;
  }

  private renderSingleImage(imageContent: ImageContent): TemplateResult {
    const imageUrl = imageContent.storagePath
      ? this.imageUrls.get(imageContent.storagePath)
      : undefined;

    return html`
      <img src=${ifDefined(imageUrl)} alt=${ifDefined(imageContent.altText)} />
      ${this.renderCaption(imageContent.caption)}
    `;
  }

  override render() {
    if (!this.content) return nothing;

    if (this.isLoading) {
      return html`<div>Loading image...</div>`;
    }

    if (isFigureContent(this.content)) {
      const figureContent = this.content;
      return html`
        <figure class="figure-group">
          <div class="subfigures-container">
            ${figureContent.images.map((image) => {
              const subFigureClasses = classMap({
                ["subfigure"]: true,
                ["is-only-image"]: figureContent.images.length === 1,
              });
              return html`
                <figure class=${subFigureClasses}>
                  ${this.renderSingleImage(image)}
                </figure>
              `;
            })}
          </div>
          ${this.renderCaption(figureContent.caption)}
        </figure>
      `;
    } else {
      const imageContent = this.content;
      return html`
        <figure class="single-image">
          ${this.renderSingleImage(imageContent)}
        </figure>
      `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-image-content": LumiImageContent;
  }
}
