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

import { html, nothing, TemplateResult } from "lit";
import { LumiFootnote } from "../../../shared/lumi_doc";

import "../../lumi_span/lumi_span";
import { LumiFont } from "../../../shared/types";

export interface FootnotesRendererProperties {
  footnotes: LumiFootnote[];
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
}

function renderFootnote(footnote: LumiFootnote, index: number) {
  return html`<div class="footnote-item">
    <span class="footnote-index">${index + 1}.</span>
    <lumi-span
      .span=${footnote.span}
      .spanProperties=${{ span: footnote.span, font: LumiFont.PAPER_TEXT }}
    ></lumi-span>
  </div>`;
}

export function renderFootnotes(
  props: FootnotesRendererProperties
): TemplateResult | typeof nothing {
  const { footnotes, isCollapsed, onCollapseChange } = props;

  if (!footnotes || footnotes.length === 0) {
    return nothing;
  }

  return html`
    <div class="footnotes-renderer-container">
      <div class="footnotes">
        <h2 class="footnotes-header">
          <pr-icon-button
            variant="default"
            @click=${() => {
              onCollapseChange(!isCollapsed);
            }}
            .icon=${isCollapsed ? "chevron_right" : "keyboard_arrow_down"}
          ></pr-icon-button>
          Footnotes
        </h2>
        ${isCollapsed
          ? nothing
          : footnotes.map((footnote, index) => renderFootnote(footnote, index))}
      </div>
    </div>
  `;
}
