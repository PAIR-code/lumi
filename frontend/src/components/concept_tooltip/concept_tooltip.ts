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
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ConceptTooltipProps } from '../../services/floating_panel_service';
import { styles } from './concept_tooltip.scss';

import '../lumi_concept/lumi_concept_contents';

/**
 * A tooltip component to display information about a LumiConcept.
 */
@customElement('concept-tooltip')
export class ConceptTooltip extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Object }) props!: ConceptTooltipProps;

  override render() {
    if (!this.props?.concept) {
      return nothing;
    }

    const { concept } = this.props;

    return html`
      <div class="concept-tooltip-component">
        <div class="concept-name">${concept.name}</div>
        <lumi-concept-contents
          .conceptId=${concept.id}
          .contents=${concept.contents}
        ></lumi-concept-contents>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'concept-tooltip': ConceptTooltip;
  }
}
