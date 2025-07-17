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
import {
  ListContent,
  LumiContent,
  LumiSpan,
  LumiSummary,
  TextContent,
} from "../../../shared/lumi_doc";
import { FocusState } from "../../../shared/types";
import {
  renderLumiSpan,
  LumiSpanRendererProperties,
} from "../../lumi_span/lumi_span_renderer";
import "../../lumi_span/lumi_span";

import "../../lumi_content/lumi_image_content";
import "../../lumi_content/lumi_html_figure_content";
import { HighlightManager } from "../../../shared/highlight_manager";

export interface ContentRendererProperties {
  content: LumiContent;
  summary: LumiSummary | null;
  spanSummaries: Map<string, LumiSummary>;
  focusedSpanId: string | null;
  displayContentSummaries: boolean;
  getImageUrl?: (path: string) => Promise<string>;
  onSpanSummaryMouseEnter: (spanIds: string[]) => void;
  onSpanSummaryMouseLeave: () => void;
  highlightManager: HighlightManager;
  onSpanReferenceClicked?: (referenceId: string) => void;
}

function renderSpans(
  spans: LumiSpan[],
  props: ContentRendererProperties,
  monospace = false
): TemplateResult[] {
  return spans.map((span) => {
    const highlights = props.highlightManager.getSpanHighlights(span.id);

    const spanContent = renderLumiSpan({
      span,
      monospace,
      highlights,
      onSpanReferenceClicked: props.onSpanReferenceClicked,
    });

    const { focusState } = getFocusState(props.focusedSpanId, [span.id]);
    return html`<lumi-span .span=${span} .focusState=${focusState}
      >${spanContent}</lumi-span
    >`;
  });
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

function renderSpanSummaries(props: ContentRendererProperties) {
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

      const { isFocused, hasFocus, focusState } = getFocusState(
        props.focusedSpanId,
        spanIds
      );

      const classesObject: { [key: string]: boolean } = {
        "span-summary": true,
        "focused-span": isFocused,
        "unfocused-span": hasFocus && !isFocused,
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

function renderLeftAnnotation(props: ContentRendererProperties) {
  if (!props.displayContentSummaries || props.content.imageContent) {
    return nothing;
  }

  const classesObject: { [key: string]: boolean } = {
    "left-annotation": true,
  };

  const summaryClassesObject: { [key: string]: boolean } = {
    summary: true,
    "has-focused-span": !!props.focusedSpanId,
  };

  return html`<div class=${classMap(classesObject)}>
    <div class="inner-summary">
      <div class=${classMap(summaryClassesObject)}>
        ${props.summary
          ? html`<lumi-span
              .classMap=${{
                "summary-span": true,
                "left-annotation-summary-text": true,
              }}
              .span=${props.summary.summary}
              >${renderLumiSpan({ span: props.summary.summary })}</lumi-span
            >`
          : nothing}
      </div>
      <div class="span-summaries">${renderSpanSummaries(props)}</div>
    </div>
  </div>`;
}

function renderListContent(
  props: ContentRendererProperties,
  listContent: ListContent
) {
  if (!listContent) {
    return nothing;
  }

  const listItemsHtml: TemplateResult[] = listContent.listItems.map(
    (listItem) => {
      const spans = listItem.spans;
      const classesObject: { [key: string]: boolean } = {
        "list-item": true,
      };
      return html`<li class=${classMap(classesObject)}>
        ${renderSpans(spans, props)}
        ${listItem.subListContent
          ? renderListContent(props, listItem.subListContent)
          : nothing}
      </li>`;
    }
  );

  if (listContent.isOrdered) {
    return html`<ol>
      ${listItemsHtml}
    </ol>`;
  } else {
    return html`<ul>
      ${listItemsHtml}
    </ul>`;
  }
}

function renderTextContent(
  props: ContentRendererProperties,
  textContent: TextContent
) {
  const tagName = textContent?.tagName ?? "";
  if (!tagName) {
    return nothing;
  }
  const spans = textContent?.spans ?? [];
  const monospace = tagName === "code" || tagName === "pre";

  const spansHtml = renderSpans(spans, props, monospace);
  if (tagName === "p") {
    return html`<p>${spansHtml}</p>`;
  } else if (tagName === "code") {
    return html`<code class="code">${spansHtml}</code>`;
  } else if (tagName === "pre") {
    return html` <pre>${spansHtml}</pre> `;
  } else if (tagName === "figcaption") {
    return html`<figcaption>${spansHtml}</figcaption>`;
  } else {
    console.error("Unsupported tag name: ", tagName);
    return html`<div>${spansHtml}</div>`;
  }
}

function renderMainContent(props: ContentRendererProperties) {
  const { content, getImageUrl } = props;
  if (content.htmlFigureContent) {
    return html`<lumi-html-figure-content
      .content=${content.htmlFigureContent}
    ></lumi-html-figure-content>`;
  }
  if (content.imageContent) {
    return html`<lumi-image-content
      .imageContent=${content.imageContent}
      .getImageUrl=${getImageUrl}
    ></lumi-image-content>`;
  }
  if (content.textContent) {
    return renderTextContent(props, content.textContent);
  }
  if (content.listContent) {
    return renderListContent(props, content.listContent);
  }
  return nothing;
}

export function renderContent(props: ContentRendererProperties) {
  const onContentClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const classesObject: { [key: string]: boolean } = {
    "main-content": true,
    "pre-container": props.content.textContent?.tagName === "pre",
    "code-container": props.content.textContent?.tagName === "code",
  };

  return html`
    <div class="content-renderer-container">
      <div class=${classMap(classesObject)} @click=${onContentClick}>
        ${renderMainContent(props)}
      </div>
      ${renderLeftAnnotation(props)}
    </div>
  `;
}
