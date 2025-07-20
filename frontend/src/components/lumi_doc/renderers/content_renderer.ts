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

import { html, LitElement, nothing, TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import {
  ListContent,
  LumiContent,
  LumiSpan,
  LumiSummary,
  TextContent,
} from "../../../shared/lumi_doc";
import { FocusState } from "../../../shared/types";
import { renderLumiSpan } from "../../lumi_span/lumi_span_renderer";
import "../../lumi_span/lumi_span";

import "../../lumi_content/lumi_image_content";
import "../../lumi_content/lumi_html_figure_content";
import { HighlightManager } from "../../../shared/highlight_manager";
import { renderContentSummary } from "./content_summary_renderer";
import { CollapseManager } from "../../../shared/collapse_manager";

export interface ContentRendererProperties {
  parentComponent: LitElement;
  content: LumiContent;
  summary: LumiSummary | null;
  spanSummaries: Map<string, LumiSummary>;
  focusedSpanId: string | null;
  getImageUrl?: (path: string) => Promise<string>;
  onSpanSummaryMouseEnter: (spanIds: string[]) => void;
  onSpanSummaryMouseLeave: () => void;
  highlightManager: HighlightManager;
  collapseManager: CollapseManager;
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

  const mainContentClassesObject: { [key: string]: boolean } = {
    "main-content": true,
    "pre-container": props.content.textContent?.tagName === "pre",
    "code-container": props.content.textContent?.tagName === "code",
  };

  const isCollapsed = props.collapseManager.getMobileSummaryCollapseState(
    props.content.id
  );

  const contentRendererContainerClassesObject: { [key: string]: boolean } = {
    ["content-renderer-container"]: true,
    ["collapsed"]: isCollapsed,
  };

  return html`
    <div class=${classMap(contentRendererContainerClassesObject)}>
      <div class=${classMap(mainContentClassesObject)} @click=${onContentClick}>
        ${renderMainContent(props)}
      </div>
      ${renderContentSummary({
        ...props,
        isCollapsed,
        onCollapseChange: () => {
          props.collapseManager.toggleMobileSummaryCollapse(props.content.id);
          props.parentComponent.requestUpdate();
        },
      })}
    </div>
  `;
}
