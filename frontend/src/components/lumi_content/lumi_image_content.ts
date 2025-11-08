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
import { CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { consume } from '@lit/context';

import { FigureContent, ImageContent, LumiSpan } from '../../shared/lumi_doc';
import '../lumi_span/lumi_span';
import '../lumi_image/lumi_image';

import { styles } from './lumi_image_content.scss';
import { makeObservable } from 'mobx';
import { classMap } from 'lit/directives/class-map.js';
import { HighlightManager } from '../../shared/highlight_manager';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { scrollContext, ScrollState } from '../../contexts/scroll_context';
import { ImageInfo } from '../../shared/api';
import { getSpanHighlightsFromManagers } from '../lumi_span/lumi_span_utils';

function isFigureContent(
  content: ImageContent | FigureContent
): content is FigureContent {
  return 'images' in content;
}

/**
 * An image visualization in the Lumi visualization.
 * Can render a single image or a group of subfigures.
 */
@customElement('lumi-image-content')
export class LumiImageContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) content!: ImageContent | FigureContent;
  @property({ type: Object }) getImageUrl?: (path: string) => Promise<string>;
  @property({ type: Object }) highlightManager?: HighlightManager;
  @property({ type: Object }) answerHighlightManager?: AnswerHighlightManager;
  @property({ type: Object }) onImageClick?: (
    info: ImageInfo,
    target: HTMLElement
  ) => void;

  @consume({ context: scrollContext, subscribe: true })
  @property({ attribute: false })
  private scrollContext?: ScrollState;

  private readonly imageRefs = new Map<string, Ref<HTMLElement>>();

  constructor() {
    super();
    makeObservable(this);
  }

  override disconnectedCallback() {
    this.imageRefs.forEach((_, storagePath) => {
      this.scrollContext?.unregisterImage(storagePath);
    });
    this.imageRefs.clear();
    super.disconnectedCallback();
  }

  override updated() {
    const imageContents = isFigureContent(this.content)
      ? this.content.images
      : [this.content];

    for (const image of imageContents) {
      if (image.storagePath) {
        if (!this.imageRefs.has(image.storagePath)) {
          this.imageRefs.set(image.storagePath, createRef<HTMLElement>());
        }
        const imageRef = this.imageRefs.get(image.storagePath)!;
        this.scrollContext?.registerImage(image.storagePath, imageRef);
      }
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
        <lumi-span
          .span=${caption}
          .highlights=${getSpanHighlightsFromManagers(
            caption.id,
            this.highlightManager,
            this.answerHighlightManager
          )}
        ></lumi-span>
      </figcaption>
    `;
  }

  private renderSingleImage(
    imageContent: ImageContent
  ): TemplateResult | typeof nothing {
    if (!imageContent.storagePath) return nothing;

    const handleImageClick = (e: MouseEvent) => {
      if (this.onImageClick && imageContent.storagePath) {
        const captionText = imageContent.caption
          ? imageContent.caption.text
          : undefined;

        const image: ImageInfo = {
          imageStoragePath: imageContent.storagePath,
          caption: captionText,
        };
        this.onImageClick(image, e.currentTarget as HTMLElement);
      }
    };

    const isHighlighted = this.highlightManager?.isImageHighlighted(
      imageContent.storagePath
    );

    const imageRef = this.imageRefs.get(imageContent.storagePath)!;

    return html`
      <lumi-image
        ${ref(imageRef)}
        .storagePath=${imageContent.storagePath}
        .altText=${imageContent.altText}
        .getImageUrl=${this.getImageUrl}
        .onImageClick=${handleImageClick}
        .enableHover=${true}
        .highlighted=${isHighlighted}
        title="Click to ask question"
      ></lumi-image>
      ${this.renderCaption(imageContent.caption)}
    `;
  }

  override render() {
    if (!this.content) return nothing;

    if (isFigureContent(this.content)) {
      const figureContent = this.content;
      return html`
        <figure class="figure-group">
          <div class="subfigures-container">
            ${figureContent.images.map((image) => {
              const subFigureClasses = classMap({
                ['subfigure']: true,
                ['is-only-image']: figureContent.images.length === 1,
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
    'lumi-image-content': LumiImageContent;
  }
}
