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
import { CSSResultGroup, html, HTMLTemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styles } from './table_of_contents.scss';
import { LumiSection, LumiSpan, LumiSummaries } from '../../shared/lumi_doc';
import { classMap } from 'lit/directives/class-map.js';
import { LumiSummaryMaps } from '../../shared/lumi_summary_maps';

@customElement('table-of-contents')
export class TableOfContents extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({ type: Array }) sections: LumiSection[] = [];
  @property({ type: Object }) lumiSummariesMap?: LumiSummaryMaps;
  @property({ attribute: false }) onSectionClicked: (
    sectionId: string
  ) => void = () => {};

  private renderSections(
    sections: LumiSection[]
  ): HTMLTemplateResult | typeof nothing {
    if (!sections || sections.length === 0) {
      return nothing;
    }

    return html`
      <ul class="toc-list">
        ${sections.map((section: LumiSection) => {
          const listClasses = {
            ['level']: true,
          };

          const buttonClasses = {
            ['toc-button']: true,
            [`level-${section.heading.headingLevel}`]: true,
          };

          const summary = this.lumiSummariesMap?.sectionSummariesMap.get(
            section.id
          );

          return html`
            <li class=${classMap(listClasses)}>
              <div
                class=${classMap(buttonClasses)}
                @click=${() => {
                  this.onSectionClicked(section.id);
                }}
              >
                <span class="item-text">${section.heading.text}</span>
                ${this.renderSummarySpan(summary?.summary)}
              </div>
              ${section.subSections && this.renderSections(section.subSections)}
            </li>
          `;
        })}
      </ul>
    `;
  }

  private renderSummarySpan(span?: LumiSpan) {
    if (!span) return nothing;

    return html` <lumi-span class="item-summary" .span=${span}></lumi-span> `;
  }

  override render() {
    return html`<div class="toc-container">
      ${this.renderSections(this.sections)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'table-of-contents': TableOfContents;
  }
}
