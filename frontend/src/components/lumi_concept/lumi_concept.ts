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

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { LumiConcept } from '../../shared/lumi_doc';

import '../lumi_span/lumi_span';
import './lumi_concept_contents';

import { styles } from './lumi_concept.scss';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { HighlightManager } from '../../shared/highlight_manager';
import { LumiAnswer } from '../../shared/api';

/**
 * Displays a Lumi Concept.
 */
@customElement('lumi-concept')
export class LumiConceptViz extends LightMobxLitElement {
  @property({ type: Object }) concept!: LumiConcept;
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) answerHighlightManager!: AnswerHighlightManager;

  @property() onAnswerHighlightClick: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void = () => {};

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="lumi-concept-host">
        <div class="lumi-concept-header">
          <h2 class="lumi-concept-heading">${this.concept.name}</h2>
        </div>
        ${this.renderContents()}
      </div>
    `;
  }

  private renderContents() {
    return html`
      <lumi-concept-contents
        .conceptId=${this.concept.id}
        .contents=${this.concept.contents}
        .highlightManager=${this.highlightManager}
        .answerHighlightManager=${this.answerHighlightManager}
        .onAnswerHighlightClick=${this.onAnswerHighlightClick}
      >
      </lumi-concept-contents>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-concept': LumiConceptViz;
  }
}
