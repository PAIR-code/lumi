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
import { classMap } from "lit/directives/class-map.js";
import { LumiContent, LumiSummary } from "../../../shared/lumi_doc";
import { FocusState } from "../../../shared/types";
import { renderLumiSpan } from "../../lumi_span/lumi_span_renderer";
import "../../lumi_span/lumi_span";
import "../../../pair-components/icon";

export interface ContentSummaryRendererProperties {
  content: LumiContent;
  summary: LumiSummary | null;
  spanSummaries: Map<string, LumiSummary>;
  focusedSpanId: string | null;
  isCollapsed: boolean;
  onCollapseChange: () => void;
  onSpanSummaryMouseEnter: (spanIds: string[]) => void;
  onSpanSummaryMouseLeave: () => void;
}

function getFocusState(focusedSpanId: string | null, spanIds: string[]) {
  const isFocused = !!focusedSpanId && spanIds.includes(focusedSpanId);
  const hasFocus = !!focusedSpanId;

  const focusState = isFocused
    ? FocusState.FOCUSED
    : hasFocus
    ? FocusState.UNFOCUSED
    : FocusState.DEFAULT;
  return { isFocused, hasFocus, focusState };
}

function renderSpanSummaries(props: ContentSummaryRendererProperties) {
  // Only render sentence-level summaries if there is more
  // than 1 sentence in the content.
  if (!props.spanSummaries || props.spanSummaries.size <= 1) {
    return nothing;
  }

  // Don't render span summaries for list content
  if (props.content.listContent) {
    return nothing;
  }

  const summariesToSpanIds = new Map<string, string[]>();
  props.spanSummaries.forEach((summary) => {
    const existingIds = summariesToSpanIds.get(summary.summary.text);
    if (existingIds) {
      existingIds.push(summary.id);
    } else {
      summariesToSpanIds.set(summary.summary.text, [summary.id]);
    }
  });

  return html`
    ${Array.from(summariesToSpanIds.entries()).map((summaryEntry) => {
      const [summaryText, spanIds] = summaryEntry;
      // Find the first summary that matches the text to use as a representative
      const summary = Array.from(props.spanSummaries.values()).find(
        (s) => s.summary.text === summaryText
      );
      if (!summary) return nothing;

      const { focusState } = getFocusState(props.focusedSpanId, spanIds);

      const classesObject: { [key: string]: boolean } = {
        "span-summary": true,
      };

      const handleSummaryMouseEnter = () => {
        props.onSpanSummaryMouseEnter(spanIds);
      };

      const handleSummaryMouseLeave = () => {
        props.onSpanSummaryMouseLeave();
      };

      return html` <div
        @mouseenter=${handleSummaryMouseEnter}
        @mouseleave=${handleSummaryMouseLeave}
        class=${classMap(classesObject)}
      >
        <lumi-span
          .classMap=${{ "span-summary-text": true }}
          .span=${summary.summary}
          .focusState=${focusState}
          >${renderLumiSpan({ span: summary.summary })}</lumi-span
        >
      </div>`;
    })}
  `;
}

function renderSummaries(props: ContentSummaryRendererProperties) {
  const summaryClasses = {
    summary: true,
    "has-focused-span": !!props.focusedSpanId,
  };

  return html`
    <div class="summaries-container">
      <div class=${classMap(summaryClasses)}>
        ${props.summary
          ? html`<lumi-span
              .classMap=${{
                "summary-span": true,
              }}
              .span=${props.summary.summary}
              >${renderLumiSpan({ span: props.summary.summary })}</lumi-span
            >`
          : nothing}
      </div>
      <div class="span-summaries">${renderSpanSummaries(props)}</div>
    </div>
  `;
}

export function renderContentSummary(props: ContentSummaryRendererProperties) {
  if (props.content.imageContent || !props.summary) {
    return nothing;
  }

  const { isCollapsed, onCollapseChange } = props;

  const containerClasses = {
    "content-summary-renderer-container": true,
    collapsed: isCollapsed,
  };

  const innerSummaryClasses = {
    "inner-summary": true,
    ["collapsed"]: isCollapsed,
  };

  const icon = isCollapsed ? "chevron_left" : "chevron_right";
  const title = isCollapsed ? "Show summary" : "Hide summary";

  return html`<div class=${classMap(containerClasses)}>
    <div class=${classMap(innerSummaryClasses)}>
      <div
        class="toggle-container"
        @click=${() => {
          onCollapseChange();
        }}
      >
        <pr-icon icon=${icon} title=${title} variant="default"></pr-icon>
      </div>
      ${renderSummaries(props)}
    </div>
  </div>`;
}
