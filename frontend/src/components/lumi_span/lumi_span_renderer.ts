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

import { html, TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { renderKatex } from "../../directives/katex_directive";

import {
  Highlight,
  InnerTagMetadata,
  InnerTagName,
  LumiFootnote,
  LumiReference,
  LumiSpan,
} from "../../shared/lumi_doc";
import { flattenTags } from "./lumi_span_utils";
import { HighlightManager } from "../../shared/highlight_manager";
import { AnswerHighlightManager } from "../../shared/answer_highlight_manager";
import { LumiAnswer } from "../../shared/api";
import {
  HIGHLIGHT_METADATA_ANSWER_KEY,
  CITATION_CLASSNAME,
  FOOTNOTE_CLASSNAME,
  LumiFont,
} from "../../shared/constants";

interface FormattingCounter {
  [key: string]: InnerTagMetadata;
}

interface InlineCitation {
  index: number;
  reference: LumiReference;
}

interface InlineSpanCitation {
  index: number;
  id: string;
}

const GENERAL_HIGHLIGHT_KEY = "general_highlight_key";
const COLOR_HIGHLIGHT_KEY = "highlight_color";

export interface LumiSpanRendererProperties {
  span: LumiSpan;
  additionalHighlights?: Highlight[];
  highlightManager?: HighlightManager;
  answerHighlightManager?: AnswerHighlightManager;
  references?: LumiReference[];
  footnotes?: LumiFootnote[];
  referencedSpans?: LumiSpan[];
  onReferenceClicked?: (referenceId: string) => void;
  onSpanReferenceClicked?: (referenceId: string) => void;
  onConceptClick?: (conceptId: string, target: HTMLElement) => void;
  onPaperReferenceClick?: (
    reference: LumiReference,
    target: HTMLElement
  ) => void;
  onFootnoteClick?: (footnote: LumiFootnote, target: HTMLElement) => void;
  onAnswerHighlightClick?: (answer: LumiAnswer, target: HTMLElement) => void;
  monospace?: boolean;
  font?: LumiFont;
}

function renderEquation(
  equationText: string,
  hasDisplayMathTag: boolean
): TemplateResult {
  const equationClasses = classMap({
    ["equation"]: true,
    ["display"]: hasDisplayMathTag,
  });
  return html`<span
    class=${equationClasses}
    ${renderKatex(equationText, hasDisplayMathTag)}
  ></span>`;
}

function renderFormattedCharacter(
  props: LumiSpanRendererProperties,
  character: string,
  classesAndMetadata: { [key: string]: { [key: string]: any } }
): TemplateResult {
  const classesObject: { [key: string]: boolean } = {};
  Object.keys(classesAndMetadata).forEach((key) => {
    classesObject[key] = true;
  });

  if (props.font) {
    classesObject[props.font] = true;
  }

  const highlightMetadata = classesAndMetadata[GENERAL_HIGHLIGHT_KEY];
  if (highlightMetadata) {
    classesObject[highlightMetadata[COLOR_HIGHLIGHT_KEY]] = true;
    if (highlightMetadata[HIGHLIGHT_METADATA_ANSWER_KEY]) {
      classesObject["clickable"] = true;
    }
  }

  // REFERENCE, SPAN_REFERENCE, and FOOTNOTE tags are handled by the insertions map now.
  if (
    classesObject[InnerTagName.REFERENCE] ||
    classesObject[InnerTagName.SPAN_REFERENCE] ||
    classesObject[InnerTagName.FOOTNOTE]
  ) {
    return html``;
  }

  if (classesObject[InnerTagName.A]) {
    const metadata = classesAndMetadata[InnerTagName.A];
    const href = metadata["href"] || "#";
    // Use a real <a> tag for links.
    return html`<a href=${href} target="_blank" class=${classMap(classesObject)}
      >${character}</a
    >`;
  }

  const onClick = (e: MouseEvent) => {
    if (Object.keys(classesObject).includes(InnerTagName.CONCEPT)) {
      const metadata = classesAndMetadata[InnerTagName.CONCEPT];
      if (metadata["conceptId"] && props.onConceptClick) {
        props.onConceptClick(
          metadata["conceptId"],
          e.currentTarget as HTMLElement
        );
      }
    }

    if (classesAndMetadata[GENERAL_HIGHLIGHT_KEY]) {
      const metadata = classesAndMetadata[GENERAL_HIGHLIGHT_KEY];
      const answer = metadata[HIGHLIGHT_METADATA_ANSWER_KEY];
      if (answer && props.onAnswerHighlightClick) {
        props.onAnswerHighlightClick(
          answer as LumiAnswer,
          e.currentTarget as HTMLElement
        );
      }
    }
  };

  return html`<span class=${classMap(classesObject)} @click=${onClick}
    >${character}</span
  >`;
}

function renderNonformattedCharacters(
  props: LumiSpanRendererProperties,
  value: string
): TemplateResult {
  const characterClasses: { [key: string]: boolean } = {
    ["character"]: true,
  };

  if (props.font) {
    characterClasses[props.font] = true;
  }

  return html`${value
    .split("")
    .map(
      (character) =>
        html`<span class=${classMap(characterClasses)}>${character}</span>`
    )}`;
}

function createInsertionsMap(props: LumiSpanRendererProperties) {
  new Map<number, TemplateResult[]>();
  const {
    span,
    references,
    footnotes,
    referencedSpans,
    onPaperReferenceClick,
    onFootnoteClick,
    onSpanReferenceClicked,
  } = props;
  const insertions = new Map<number, TemplateResult[]>();
  // Pre-process tags to create an insertions map.
  span.innerTags.forEach((innerTag) => {
    if (
      innerTag.tagName === InnerTagName.REFERENCE &&
      innerTag.metadata["id"] &&
      references
    ) {
      const refIds = innerTag.metadata["id"].split(",").map((s) => s.trim());
      const citations: InlineCitation[] = [];

      refIds.forEach((refId) => {
        const refIndex = references.findIndex((ref) => ref.id === refId);
        if (refIndex !== -1) {
          citations.push({
            index: refIndex + 1,
            reference: references[refIndex],
          });
        }
      });

      if (citations.length > 0) {
        const citationTemplate = html`<span class=${CITATION_CLASSNAME}
          >${citations.map((citation) => {
            return html`<span
              class="inline-citation"
              tabindex="0"
              @click=${(e: MouseEvent) => {
                if (onPaperReferenceClick) {
                  e.stopPropagation();
                  onPaperReferenceClick(
                    citation.reference,
                    e.currentTarget as HTMLElement
                  );
                }
              }}
              >${citation.index}</span
            >`;
          })}</span
        >`;

        const insertionIndex = innerTag.position.startIndex;
        if (!insertions.has(insertionIndex)) {
          insertions.set(insertionIndex, []);
        }
        insertions.get(insertionIndex)!.push(citationTemplate);
      }
    } else if (
      innerTag.tagName === InnerTagName.FOOTNOTE &&
      innerTag.metadata["id"] &&
      footnotes
    ) {
      const footnoteId = innerTag.metadata["id"];
      const footnoteIndex = footnotes.findIndex(
        (note) => note.id === footnoteId
      );

      if (footnoteIndex !== -1) {
        const index = footnoteIndex + 1;
        const footnote = footnotes[footnoteIndex];

        const footnoteTemplate = html`<sup
          class=${FOOTNOTE_CLASSNAME}
          tabindex="0"
          @click=${(e: MouseEvent) => {
            if (onFootnoteClick) {
              e.stopPropagation();
              onFootnoteClick(footnote, e.currentTarget as HTMLElement);
            }
          }}
          >${index}</sup
        >`;

        const insertionIndex = innerTag.position.startIndex;
        if (!insertions.has(insertionIndex)) {
          insertions.set(insertionIndex, []);
        }
        insertions.get(insertionIndex)!.push(footnoteTemplate);
      }
    } else if (
      innerTag.tagName === InnerTagName.SPAN_REFERENCE &&
      innerTag.metadata["id"] &&
      referencedSpans
    ) {
      const refId = innerTag.metadata["id"];
      const citations: InlineSpanCitation[] = [];

      const refIndex = referencedSpans.map((span) => span.id).indexOf(refId);
      if (refIndex !== -1) {
        citations.push({
          index: refIndex + 1,
          id: refId,
        });
      }

      if (citations.length > 0) {
        const citationTemplate = html`<span class="citation-marker"
          >${citations.map((citation) => {
            return html`<span
              class="span-inline-citation inline-citation"
              tabindex="0"
              @click=${(e: MouseEvent) => {
                if (onSpanReferenceClicked) {
                  e.stopPropagation();
                  onSpanReferenceClicked(citation.id);
                }
              }}
              >${citation.index}</span
            >`;
          })}</span
        >`;

        const insertionIndex = innerTag.position.startIndex;
        if (!insertions.has(insertionIndex)) {
          insertions.set(insertionIndex, []);
        }
        insertions.get(insertionIndex)!.push(citationTemplate);
      }
    }
  });

  return insertions;
}

function getHighlightsFromManagers(
  spanId: string,
  highlightManager?: HighlightManager,
  answerHighlightManager?: AnswerHighlightManager
) {
  const highlights = [];
  if (highlightManager) {
    highlights.push(...highlightManager.getSpanHighlights(spanId));
  }

  if (answerHighlightManager) {
    highlights.push(...answerHighlightManager.getSpanHighlights(spanId));
  }

  return highlights;
}

/**
 * Renders the content of a LumiSpan, including text and inner tags.
 * This logic was extracted from the `lumi-span` component to allow for
 * rendering into the Light DOM of a parent component.
 */
export function renderLumiSpan(
  props: LumiSpanRendererProperties
): TemplateResult {
  const {
    span,
    highlightManager,
    answerHighlightManager,
    additionalHighlights = [],
    monospace = false,
  } = props;

  if (!span) return html``;

  const highlights = [
    ...additionalHighlights,
    ...getHighlightsFromManagers(
      span.id,
      highlightManager,
      answerHighlightManager
    ),
  ];
  const spanText = span.text;
  const hasHighlight = highlights.length > 0;

  const allInnerTags = flattenTags(span.innerTags || []);

  const insertions = createInsertionsMap(props);

  // Wrap all the character parts in a single parent span.
  const spanClasses = {
    monospace,
    "lumi-span-renderer-element": true,
  };

  // If there are no inner tags or highlights, and no insertions,
  // we can just return the plain text.
  if (!hasHighlight && !allInnerTags.length && insertions.size === 0) {
    return html`<span class=${classMap(spanClasses)}>
      ${renderNonformattedCharacters(props, span.text)}
    </span>`;
  }

  // Create an array of objects, one for each character in the span's text.
  // Each object will store the formatting tags (like 'b' for bold, 'i' for
  // italic, or a highlight color) that apply to that character.
  const formattingCounters = spanText
    .split("")
    .map((): FormattingCounter => ({}));

  // Iterate through each `innerTag` (e.g., bold, italic, link) defined in the
  // span. For each tag, mark all characters within its start and end indices
  // with the tag's name and metadata.
  allInnerTags.forEach((innerTag) => {
    const position = innerTag.position;
    for (let i = position.startIndex; i < position.endIndex; i++) {
      const currentCounter = formattingCounters[i];
      if (currentCounter) {
        currentCounter[innerTag.tagName] = {
          ...innerTag.metadata,
          ...(currentCounter[innerTag.tagName] || {}),
        };
      }
    }
  });

  // Do the same for highlights, marking the affected characters with the
  // highlight color.
  highlights.forEach((highlight) => {
    const position = highlight.position;
    // Defaults to the entire span if position is null.
    const startIndex = position ? position.startIndex : 0;
    const endIndex = position ? position.endIndex : props.span.text.length;

    for (let i = startIndex; i < endIndex; i++) {
      const currentCounter = formattingCounters[i];
      if (currentCounter) {
        currentCounter[GENERAL_HIGHLIGHT_KEY] = {
          [COLOR_HIGHLIGHT_KEY]: highlight.color,
        };
        if (highlight.metadata) {
          currentCounter[GENERAL_HIGHLIGHT_KEY] = {
            ...highlight.metadata,
            ...currentCounter[GENERAL_HIGHLIGHT_KEY],
          };
        }
      }
    }
  });

  let equationText = "";
  // Map over each character of the text to create a list of TemplateResults.
  // Each character will be wrapped in a <span> with the appropriate classes
  // based on the formatting counters we built above.
  const partsTemplateResults = spanText
    .split("")
    .flatMap((char: string, index: number) => {
      const templates: TemplateResult[] = [];

      // Prepend any insertions for the current index.
      if (insertions.has(index)) {
        templates.push(...insertions.get(index)!);
      }

      const hasBasicMathTag =
        formattingCounters[index][InnerTagName.MATH] != null;
      const hasDisplayMathTag =
        formattingCounters[index][InnerTagName.MATH_DISPLAY] != null;
      const hasMathTag = hasBasicMathTag || hasDisplayMathTag;

      // Special handling for LaTeX math equations.
      if (formattingCounters[index] && hasMathTag) {
        equationText += char;
        // If the next character is also part of the equation, do nothing yet.
        // We accumulate the full equation string first.
        const nextIndex = index + 1;
        const tagToCheck = hasBasicMathTag
          ? InnerTagName.MATH
          : InnerTagName.MATH_DISPLAY;
        if (
          nextIndex < spanText.length &&
          formattingCounters[nextIndex] &&
          formattingCounters[nextIndex][tagToCheck]
        ) {
          return templates; // Return only insertions for now
        } else {
          // At the end of the equation, render it using KaTeX.
          const currentEquationText = equationText;
          equationText = "";
          templates.push(
            renderEquation(currentEquationText, hasDisplayMathTag)
          );
          return templates;
        }
      }

      // For regular characters, render them with their associated formatting.
      templates.push(
        renderFormattedCharacter(props, char, {
          character: {},
          ...formattingCounters[index],
        })
      );

      return templates;
    });

  // Add any insertions at the very end of the span.
  if (insertions.has(spanText.length)) {
    partsTemplateResults.push(...insertions.get(spanText.length)!);
  }

  return html`<span class=${classMap(spanClasses)}
    >${partsTemplateResults}</span
  >`;
}
