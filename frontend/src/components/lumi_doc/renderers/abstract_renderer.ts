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
import {
  Highlight,
  LumiAbstract,
  LumiFootnote,
} from "../../../shared/lumi_doc";
import { renderLumiSpan } from "../../lumi_span/lumi_span_renderer";
import { HighlightManager } from "../../../shared/highlight_manager";
import { AnswerHighlightManager } from "../../../shared/answer_highlight_manager";

import "../../lumi_span/lumi_span";
import "../../../pair-components/icon_button";

export interface AbstractRendererProperties {
  abstract: LumiAbstract;
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
  excerptSpanId?: string;
  highlightManager: HighlightManager;
  answerHighlightManager: AnswerHighlightManager;
  onConceptClick?: (conceptId: string, target: HTMLElement) => void;
  onFootnoteClick?: (footnote: LumiFootnote, target: HTMLElement) => void;
  footnotes?: LumiFootnote[];
}

export function renderAbstract(
  props: AbstractRendererProperties
): TemplateResult {
  const {
    abstract,
    isCollapsed,
    onCollapseChange,
    excerptSpanId = "",
    highlightManager,
    answerHighlightManager,
    onConceptClick,
    onFootnoteClick,
    footnotes,
  } = props;

  return html`
    <div class="abstract-renderer-container">
      <div class="abstract">
        <h2 class="abstract-header">
          <pr-icon-button
            variant="default"
            @click=${() => {
              onCollapseChange(!isCollapsed);
            }}
            .icon=${isCollapsed ? "chevron_right" : "keyboard_arrow_down"}
          ></pr-icon-button
          >Abstract
        </h2>
        ${abstract.contents.map((content) => {
          return html`<div class="abstract-content">
            ${content.textContent?.spans.map((span) => {
              if (isCollapsed && span.id !== excerptSpanId) return nothing;

              const highlights: Highlight[] = [];
              // Add a special highlight for the excerpt span when not collapsed
              if (!isCollapsed && span.id === excerptSpanId) {
                highlights.push({
                  color: "blue",
                  spanId: span.id,
                  position: { startIndex: 0, endIndex: span.text.length - 1 },
                });
              }

              return html`<lumi-span .span=${span}
                >${renderLumiSpan({
                  span,
                  additionalHighlights: highlights,
                  answerHighlightManager,
                  highlightManager,
                  onConceptClick,
                  footnotes,
                  onFootnoteClick,
                })}</lumi-span
              >`;
            })}
          </div>`;
        })}
      </div>
    </div>
  `;
}
