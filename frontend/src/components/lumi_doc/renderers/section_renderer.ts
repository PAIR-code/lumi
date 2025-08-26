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
  LumiFootnote,
  LumiReference,
  LumiSection,
  LumiSpan,
  LumiSummary,
} from "../../../shared/lumi_doc";
import { LumiSummaryMaps } from "../../../shared/lumi_summary_maps";
import { renderContent } from "./content_renderer";
import { HighlightManager } from "../../../shared/highlight_manager";
import { HighlightSelection } from "../../../shared/selection_utils";

import "../lumi_section";
import "../../lumi_span/lumi_span";
import { CollapseManager } from "../../../shared/collapse_manager";
import { getAllContents } from "../../../shared/lumi_doc_utils";
import { AnswerHighlightManager } from "../../../shared/answer_highlight_manager";
import { LumiAnswer } from "../../../shared/api";
import { LumiFont } from "../../../shared/types";

const EMPTY_PLACEHOLDER_TEXT = "section";

export interface SectionRendererProperties {
  parentComponent: LitElement;
  section: LumiSection;
  references: LumiReference[];
  footnotes?: LumiFootnote[];
  summaryMaps: LumiSummaryMaps | null;
  hoverFocusedSpanId: string | null;
  getImageUrl?: (path: string) => Promise<string>;
  onSpanSummaryMouseEnter: (spanIds: string[]) => void;
  onSpanSummaryMouseLeave: () => void;
  highlightManager: HighlightManager;
  answerHighlightManager: AnswerHighlightManager;
  collapseManager: CollapseManager;
  onFocusOnSpan: (highlightedSpans: HighlightSelection[]) => void;
  onPaperReferenceClick: (
    reference: LumiReference,
    target: HTMLElement
  ) => void;
  onFootnoteClick: (footnote: LumiFootnote, target: HTMLElement) => void;
  onImageClick?: (
    info: { storagePath: string; caption?: string },
    target: HTMLElement
  ) => void;
  onAnswerHighlightClick?: (answer: LumiAnswer, target: HTMLElement) => void;
  isSubsection: boolean;
}

function renderHeading(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const { section } = props;
  if (!section.heading) {
    return nothing;
  }

  const headingLevel = section.heading.headingLevel;
  let headingText = section.heading.text;

  const isEmpty = headingText.length === 0;

  const classesObject: { [key: string]: boolean } = {
    "heading-text": true,
    "empty-heading-placeholder": isEmpty,
  };

  if (isEmpty) {
    headingText = EMPTY_PLACEHOLDER_TEXT;
  }

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
  return html`<lumi-span
    .span=${span}
    .spanProperties=${{
      span,
      highlightManager: props.highlightManager,
      answerHighlightManager: props.answerHighlightManager,
      references: props.references,
      footnotes: props.footnotes,
      onPaperReferenceClick: props.onPaperReferenceClick,
      onFootnoteClick: props.onFootnoteClick,
    }}
  ></lumi-span>`;
}

function renderSectionSummaryPanel(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const { summaryMaps, section, getImageUrl, onFocusOnSpan, onImageClick } =
    props;
  const summary = summaryMaps?.sectionSummariesMap.get(section.id);

  if (!summary) return nothing;

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
      ${getAllContents(section)
        .filter((content) => content.imageContent || content.figureContent)
        .map((content) => {
          if (content.figureContent) {
            return html`<lumi-image-content
              .content=${content.figureContent}
              .getImageUrl=${getImageUrl}
              .onImageClick=${onImageClick}
            ></lumi-image-content>`;
          }
          if (content.imageContent) {
            return html`<lumi-image-content
              .getImageUrl=${getImageUrl}
              .content=${content.imageContent}
              .onImageClick=${onImageClick}
            ></lumi-image-content>`;
          }
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

function renderContents(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const {
    section,
    getImageUrl,
    summaryMaps,
    hoverFocusedSpanId,
    onSpanSummaryMouseEnter,
    onSpanSummaryMouseLeave,
    highlightManager,
    collapseManager,
    answerHighlightManager,
    references,
    footnotes,
    onAnswerHighlightClick,
    onPaperReferenceClick,
    onFootnoteClick,
    onImageClick,
  } = props;

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
        parentComponent: props.parentComponent,
        content,
        references,
        footnotes,
        getImageUrl,
        summary: summaryMaps?.contentSummariesMap.get(content.id) ?? null,
        spanSummaries,
        focusedSpanId: hoverFocusedSpanId,
        onSpanSummaryMouseEnter,
        onSpanSummaryMouseLeave,
        highlightManager,
        answerHighlightManager,
        collapseManager,
        onAnswerHighlightClick,
        onPaperReferenceClick,
        onFootnoteClick,
        onImageClick,
        font: LumiFont.PAPER_TEXT,
      });
    })}
    ${renderSubsections(props)}
  </div>`;
}

function renderSubsections(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  const { section } = props;
  if (!section.subSections) return nothing;

  return html`${section.subSections.map(
    (subSection) =>
      html`<lumi-section class="subsection" .section=${subSection}>
        ${renderSection({
          ...props,
          section: subSection,
          isSubsection: true,
        })}
      </lumi-section>`
  )}`;
}

export function renderSection(
  props: SectionRendererProperties
): TemplateResult | typeof nothing {
  if (!props) return nothing;

  const { section } = props;
  if (!section.contents.length && !section.heading?.text) {
    return nothing;
  }

  const sectionContainerClasses = {
    ["section-container"]: true,
    ["is-subsection"]: props.isSubsection,
  };

  return html`<div class="section-renderer-container">
    <div class=${classMap(sectionContainerClasses)}>
      <div class="heading-grid-container">
        <div class="heading-row">${renderHeading(props)}</div>
      </div>
      ${renderContents(props)}
    </div>
  </div>`;
}
