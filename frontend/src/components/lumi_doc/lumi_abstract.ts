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

import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Highlight, LumiAbstract, LumiFootnote } from "../../shared/lumi_doc";
import { HighlightManager } from "../../shared/highlight_manager";
import { AnswerHighlightManager } from "../../shared/answer_highlight_manager";
import { LumiAnswer } from "../../shared/api";
import { LumiFont } from "../../shared/types";
import { LightMobxLitElement } from "../light_mobx_lit_element/light_mobx_lit_element";
import { styles } from "./lumi_abstract.scss";

import "../lumi_span/lumi_span";
import "../../pair-components/icon_button";

@customElement("lumi-abstract")
export class LumiAbstractViz extends LightMobxLitElement {
  @property({ type: Object }) abstract!: LumiAbstract;
  @property({ type: Boolean }) isCollapsed = false;
  @property({ type: Object }) onCollapseChange: (isCollapsed: boolean) => void =
    () => {};
  @property() excerptSpanId?: string = "";
  @property({ type: Object }) highlightManager!: HighlightManager;
  @property({ type: Object }) answerHighlightManager!: AnswerHighlightManager;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onConceptClick?: (
    conceptId: string,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onFootnoteClick?: (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => void;
  @property({ type: Array }) footnotes?: LumiFootnote[];

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="abstract-renderer-container">
        <div class="abstract">
          <h2 class="abstract-header">
            <pr-icon-button
              variant="default"
              @click=${() => {
                this.onCollapseChange(!this.isCollapsed);
              }}
              .icon=${this.isCollapsed
                ? "chevron_right"
                : "keyboard_arrow_down"}
            ></pr-icon-button
            >Abstract
          </h2>
          ${this.abstract.contents.map((content) => {
            return html`<div class="abstract-content">
              ${content.textContent?.spans.map((span) => {
                if (this.isCollapsed && span.id !== this.excerptSpanId)
                  return nothing;

                const highlights: Highlight[] = [];
                // Add a special highlight for the excerpt span when not collapsed
                if (!this.isCollapsed && span.id === this.excerptSpanId) {
                  highlights.push({
                    color: "blue",
                    spanId: span.id,
                    position: {
                      startIndex: 0,
                      endIndex: span.text.length - 1,
                    },
                  });
                }

                return html`<lumi-span
                  .span=${span}
                  .spanProperties=${{
                    span,
                    additionalHighlights: highlights,
                    answerHighlightManager: this.answerHighlightManager,
                    onAnswerHighlightClick: this.onAnswerHighlightClick,
                    highlightManager: this.highlightManager,
                    onConceptClick: this.onConceptClick,
                    footnotes: this.footnotes,
                    onFootnoteClick: this.onFootnoteClick,
                    font: LumiFont.PAPER_TEXT,
                  }}
                ></lumi-span>`;
              })}
            </div>`;
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lumi-abstract": LumiAbstractViz;
  }
}
