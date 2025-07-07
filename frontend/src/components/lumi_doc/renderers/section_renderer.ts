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
  LumiSection,
  LumiSpan,
  LumiSummary,
} from "../../../shared/lumi_doc";
import { LumiSummaryMaps } from "../../../shared/lumi_summary_maps";
import { renderContent } from "./content_renderer";
import { renderLumiSpan } from "../../lumi_span/lumi_span_renderer";
import { HighlightManager } from "../../../shared/highlight_manager";
import { HighlightSelection } from "../../../shared/selection_utils";

import "../../lumi_span/lumi_span";

export interface SectionRendererProperties {
  section: LumiSection;
  summaryMaps: LumiSummaryMaps | null;
  hoverFocusedSpanId: string | null;
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
  getImageUrl?: (path: string) => Promise<string>;
  onSpanSummaryMouseEnter: (spanIds: string[]) => void;
  onSpanSummaryMouseLeave: () => void;
  highlightManager: HighlightManager;
  onFocusOnSpan: (highlightedSpans: HighlightSelection[]) => void;
}

function renderHeading(section: LumiSection): TemplateResult | typeof nothing {
  if (!section.heading) {
    return nothing;
  }

  const headingLevel = section.heading.headingLevel;
  const headingText = section.heading.text;

  const classesObject: { [key: string]: boolean } = {
    "heading-text": true,
  };

  const onClickStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  if (headingLevel === 1) {
    return html`<h1
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h1>`;
  } else if (headingLevel === 2) {
    return html`<h2
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h2>`;
  } else if (headingLevel === 3) {
    return html`<h3
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h3>`;
  } else if (headingLevel === 4) {
    return html`<h4
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h4>`;
  } else if (headingLevel === 5) {
    return html`<h5
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h5>`;
  } else if (headingLevel === 6) {
    return html`<h6
      @click=${onClickStopPropagation}
      class=${classMap(classesObject)}
    >
      ${headingText}
    </h6>`;
  }

  return nothing;
}

function getSpanIdsFromContent(content: LumiContent): string[] {
  if (content.textContent) {
    return content.textContent.spans.map((span) => span.id);
  }
  if (content.listContent) {
    return getSpansFromListContent(content.listContent).map((span) => span.id);
  }
  return [];
}

function renderChildLumiSpan(props: SectionRendererProperties, span: LumiSpan) {
  const highlights = props.highlightManager.getSpanHighlights(span.id);
  return html`<lumi-span .span=${span}
    >${renderLumiSpan({ span, highlights })}</lumi-span
  >`;
}

function renderSectionSummaryPanel(
  props: SectionRendererProperties
): TemplateResult {
  const { summaryMaps, section, getImageUrl, highlightManager, onFocusOnSpan } =
    props;
  const summary = summaryMaps?.sectionSummariesMap.get(section.id);
  const classesObject: { [key: string]: boolean } = {
    "section-summary": true,
  };
  return html`<div class="collapse-summaries">
      <div class=${classMap(classesObject)}>
        ${summary ? renderChildLumiSpan(props, summary.summary) : ""}
      </div>
      <ul class="paragraph-summaries">
        ${section.contents.map((content) => {
          const summary = summaryMaps?.contentSummariesMap.get(content.id);
          if (!summary) return nothing;

          const handleTunnelClick = (e: MouseEvent) => {
            e.stopPropagation();
            const spanIds = getSpanIdsFromContent(content);
            const highlightSelections: HighlightSelection[] = spanIds.map(
              (spanId) => ({ spanId })
            );
            window.setTimeout(() => {
              onFocusOnSpan(highlightSelections);
            });
          };

          return html`<li>
            <div class="paragraph-summary-item">
              <div>${renderChildLumiSpan(props, summary.summary)}</div>
              <pr-icon-button
                icon="exit_to_app"
                variant="default"
                title="Go to paragraph"
                @click=${handleTunnelClick}
              ></pr-icon-button>
            </div>
          </li>`;
        })}
      </ul>
    </div>
    <div class="figures">
      ${section.contents
        .filter((content) => content.imageContent)
        .map((content) => {
          return renderContent({
            content,
            getImageUrl,
            summary: summaryMaps?.contentSummariesMap.get(content.id) ?? null,
            spanSummaries: new Map(),
            focusedSpanId: "",
            displayContentSummaries: true,
            onSpanSummaryMouseEnter: () => {},
            onSpanSummaryMouseLeave: () => {},
            highlightManager,
          });
        })}
    </div> `;
}

function getSpansFromListContent(content: ListContent) {
  let spans: LumiSpan[] = [];

  content.listItems.forEach((item) => {
    spans.push(...item.spans);
  });

  return spans;
}

function renderContents(props: SectionRendererProperties): TemplateResult {
  const {
    section,
    isCollapsed,
    getImageUrl,
    summaryMaps,
    hoverFocusedSpanId,
    onSpanSummaryMouseEnter,
    onSpanSummaryMouseLeave,
    highlightManager,
  } = props;
  if (isCollapsed) {
    return renderSectionSummaryPanel(props);
  }

  return html`<div class="content-viz">
    ${section.contents.map((content) => {
      const spans = content.textContent
        ? content.textContent.spans
        : content.listContent
        ? getSpansFromListContent(content.listContent!)
        : [];

      const spanSummaries = new Map<string, LumiSummary>();
      spans.forEach((span: LumiSpan) => {
        const summary = summaryMaps?.spanSummariesMap.get(span.id);
        if (summary) {
          spanSummaries.set(span.id, summary);
        }
      });

      return renderContent({
        content,
        getImageUrl,
        summary: summaryMaps?.contentSummariesMap.get(content.id) ?? null,
        spanSummaries,
        focusedSpanId: hoverFocusedSpanId,
        displayContentSummaries: true,
        onSpanSummaryMouseEnter,
        onSpanSummaryMouseLeave,
        highlightManager,
      });
    })}
    ${renderSubsections(props)}
  </div>`;
}

function renderSubsections(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const {
    section,
    getImageUrl,
    summaryMaps,
    onSpanSummaryMouseEnter,
    onSpanSummaryMouseLeave,
    onFocusOnSpan,
  } = props;
  if (!section.subSections) return nothing;

  // TODO(ellenj): Implement separate collapse states for subsections.
  return html`${section.subSections.map(
    (subSection) =>
      html`<div class="subsection">
        ${renderSection({
          section: subSection,
          summaryMaps: summaryMaps,
          hoverFocusedSpanId: null,
          isCollapsed: false,
          onCollapseChange: () => {},
          getImageUrl,
          onSpanSummaryMouseEnter,
          onSpanSummaryMouseLeave,
          highlightManager: props.highlightManager,
          onFocusOnSpan,
        })}
      </div>`
  )}`;
}

function renderHideButton(
  isCollapsed: boolean,
  onCollapseChange: (isCollapsed: boolean) => void
): TemplateResult {
  const handleCollapseClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCollapseChange(!isCollapsed);
  };

  const icon = isCollapsed ? "chevron_right" : "keyboard_arrow_down";
  const title = isCollapsed ? "Show section content" : "Hide section content";

  return html`
    <pr-icon-button
      class="hide-button"
      variant="default"
      icon=${icon}
      @click=${handleCollapseClick}
      title=${title}
    ></pr-icon-button>
  `;
}

function renderSectionSummary(props: SectionRendererProperties) {
  if (props.isCollapsed) {
    return nothing;
  }
  const summary = props.summaryMaps?.sectionSummariesMap.get(props.section.id);
  return html`<span class="left-section-summary"">${
    summary ? renderChildLumiSpan(props, summary.summary) : ""
  }</span>`;
}

export function renderSection(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const { section, isCollapsed, onCollapseChange } = props;
  if (!section.contents.length && !section.heading?.text) {
    return nothing;
  }

  return html`<div class="section-renderer-container">
    <div class="section-container">
      <div class="hide-button-container">
        ${renderSectionSummary(props)}
        ${renderHideButton(isCollapsed, onCollapseChange)}
      </div>
      ${renderHeading(section)} ${renderContents(props)}
    </div>
  </div>`;
}
