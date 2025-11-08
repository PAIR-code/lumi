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

import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { LumiReference } from '../../shared/lumi_doc';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { HighlightManager } from '../../shared/highlight_manager';
import { LumiFont } from '../../shared/types';
import { LumiAnswer } from '../../shared/api';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { styles } from './lumi_references.scss';

import '../lumi_span/lumi_span';
import '../../pair-components/icon_button';
import { getSpanHighlightsFromManagers } from '../lumi_span/lumi_span_utils';

@customElement('lumi-references')
export class LumiReferences extends LightMobxLitElement {
  @property({ type: Array }) references!: LumiReference[];
  @property({ type: Boolean }) isCollapsed = false;
  @property({ type: Object }) onCollapseChange: (isCollapsed: boolean) => void =
    () => {};
  @property({ type: Object }) highlightManager?: HighlightManager;
  @property({ type: Object }) answerHighlightManager?: AnswerHighlightManager;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;

  private renderReference(reference: LumiReference) {
    const lumiSpanClasses = classMap({
      reference: true,
    });

    return html`<lumi-span
      id=${reference.id}
      class=${lumiSpanClasses}
      .span=${reference.span}
      .highlights=${getSpanHighlightsFromManagers(
        reference.span.id,
        this.highlightManager,
        this.answerHighlightManager
      )}
      .onAnswerHighlightClick=${this.onAnswerHighlightClick}
      .font=${LumiFont.PAPER_TEXT}
    ></lumi-span>`;
  }

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="references-renderer-container">
        <div class="references">
          <h2 class="references-header">
            <pr-icon-button
              variant="default"
              @click=${() => {
                this.onCollapseChange(!this.isCollapsed);
              }}
              .icon=${this.isCollapsed
                ? 'chevron_right'
                : 'keyboard_arrow_down'}
            ></pr-icon-button>
            References
          </h2>
          ${this.isCollapsed
            ? nothing
            : this.references.map((reference) =>
                this.renderReference(reference)
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-references': LumiReferences;
  }
}
