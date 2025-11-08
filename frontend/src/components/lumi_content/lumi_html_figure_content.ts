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
import { CSSResultGroup, html, nothing, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import DOMPurify from 'dompurify';

import { HtmlFigureContent } from '../../shared/lumi_doc';

import {
  preprocessHtmlForKatex,
  renderKatexInHtml,
} from './lumi_html_figure_utils';

import { styles } from './lumi_html_figure_content.scss';

/**
 * A component to render sanitized HTML content for figures like tables,
 * algorithms, etc.
 */
@customElement('lumi-html-figure-content')
export class LumiHtmlFigureContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) content!: HtmlFigureContent;
  private katexExpressions: string[] = [];

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // After the component has rendered, find and replace LaTeX placeholders.
    if (changedProperties.has('content') && this.katexExpressions.length > 0) {
      const container = this.shadowRoot?.querySelector('.html-container');
      if (!container) return;
      renderKatexInHtml(container, this.katexExpressions);
    }
  }

  private preprocessAndRenderSanitizedHtml() {
    if (!this.content?.html) {
      this.katexExpressions = [];
      return nothing;
    }
    // Pre-process the HTML to replace LaTeX with placeholders.
    const { html: processedHtml, latex: katexExpressions } =
      preprocessHtmlForKatex(this.content.html);
    this.katexExpressions = katexExpressions;

    // Sanitize the HTML to prevent XSS attacks.
    const sanitizedHtml = DOMPurify.sanitize(processedHtml);
    return unsafeHTML(sanitizedHtml);
  }

  private renderCaption() {
    if (!this.content.caption) {
      return nothing;
    }
    // Assumes a lumi-span component exists to render the caption.
    return html`
      <figcaption>
        <lumi-span .span=${this.content.caption}></lumi-span>
      </figcaption>
    `;
  }

  override render() {
    return html`
      <figure class="figure-content">
        <div class="html-container">
          ${this.preprocessAndRenderSanitizedHtml()}
        </div>
        ${this.renderCaption()}
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-html-figure-content': LumiHtmlFigureContent;
  }
}
