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
import { classMap } from "lit/directives/class-map.js";
import { LumiReference } from "../../../shared/lumi_doc";

import "../../lumi_span/lumi_span";
import { AnswerHighlightManager } from "../../../shared/answer_highlight_manager";
import { HighlightManager } from "../../../shared/highlight_manager";
import { LumiFont } from "../../../shared/constants";
import { LumiAnswer } from "../../../shared/api";

export interface ReferencesRendererProperties {
  references: LumiReference[];
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
  highlightManager?: HighlightManager;
  answerHighlightManager?: AnswerHighlightManager;
  onAnswerHighlightClick?: (answer: LumiAnswer, target: HTMLElement) => void;
}

function renderReference(
  props: ReferencesRendererProperties,
  reference: LumiReference
) {
  const lumiSpanClasses = classMap({
    reference: true,
  });

  const { highlightManager, answerHighlightManager, onAnswerHighlightClick } =
    props;

  return html`<lumi-span
    id=${reference.id}
    class=${lumiSpanClasses}
    .span=${reference.span}
    .spanProperties=${{
      span: reference.span,
      highlightManager,
      answerHighlightManager,
      onAnswerHighlightClick,
      font: LumiFont.PAPER_TEXT,
    }}
  ></lumi-span>`;
}

export function renderReferences(
  props: ReferencesRendererProperties
): TemplateResult {
  const { references, isCollapsed, onCollapseChange } = props;

  return html`
    <div class="references-renderer-container">
      <div class="references">
        <h2 class="references-header">
          <pr-icon-button
            variant="default"
            @click=${() => {
              onCollapseChange(!isCollapsed);
            }}
            .icon=${isCollapsed ? "chevron_right" : "keyboard_arrow_down"}
          ></pr-icon-button>
          References
        </h2>
        ${isCollapsed
          ? nothing
          : references.map((reference) => renderReference(props, reference))}
      </div>
    </div>
  `;
}
