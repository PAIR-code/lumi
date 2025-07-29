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
import { renderKatex } from "../../directives/katex_directive";

import {
  Highlight,
  InnerTagMetadata,
  InnerTagName,
  LumiReference,
  LumiSpan,
} from "../../shared/lumi_doc";
import { flattenTags } from "./lumi_span_utils";

interface FormattingCounter {
  [key: string]: InnerTagMetadata;
}

interface InlineCitation {
  index: number;
  reference: LumiReference;
}

export interface LumiSpanRendererProperties {
  span: LumiSpan;
  references?: LumiReference[];
  onReferenceClicked?: (referenceId: string) => void;
  onSpanReferenceClicked?: (referenceId: string) => void;
  onPaperReferenceClick?: (
    reference: LumiReference,
    target: HTMLElement
  ) => void;
  highlights?: Highlight[];
  monospace?: boolean;
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
  classesAndMetadata: { [key: string]: InnerTagMetadata }
): TemplateResult {
  const classesObject: { [key: string]: boolean } = {};
  Object.keys(classesAndMetadata).forEach((key) => {
    classesObject[key] = true;
  });

  // REFERENCE tags are handled by the insertions map now.
  if (classesObject[InnerTagName.REFERENCE]) {
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

  const onClick = () => {
    if (Object.keys(classesObject).includes(InnerTagName.SPAN_REFERENCE)) {
      const metadata = classesAndMetadata[InnerTagName.SPAN_REFERENCE];
      if (metadata["id"] && props.onSpanReferenceClicked) {
        props.onSpanReferenceClicked(metadata["id"]);
      }
    }
  };

  return html`<span class=${classMap(classesObject)} @click=${onClick}
    >${character}</span
  >`;
}

function renderNonformattedCharacters(value: string): TemplateResult {
  return html`${value
    .split("")
    .map((character) => html`<span>${character}</span>`)}`;
}

function createInsertionsMap(props: LumiSpanRendererProperties) {
  new Map<number, TemplateResult[]>();
  const { span, references, onPaperReferenceClick } = props;
  const insertions = new Map<number, TemplateResult[]>();

  if (!references) return insertions;

  // Pre-process REFERENCE tags to create an insertions map.
  span.innerTags.forEach((innerTag) => {
    if (
      innerTag.tagName === InnerTagName.REFERENCE &&
      innerTag.metadata["id"]
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
        const citationTemplate = html`<span class="citation-marker"
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
    }
  });

  return insertions;
}

/**
 * Renders the content of a LumiSpan, including text and inner tags.
 * This logic was extracted from the `lumi-span` component to allow for
 * rendering into the Light DOM of a parent component.
 */
export function renderLumiSpan(
  props: LumiSpanRendererProperties
): TemplateResult {
  const { span, highlights = [], monospace = false, references = [] } = props;
  const spanText = span.text;
  const hasHighlight = highlights.length > 0;

  const allInnerTags = flattenTags(span.innerTags || []);

  const insertions = createInsertionsMap(props);

  // If there are no inner tags or highlights, and no insertions,
  // we can just return the plain text.
  if (!hasHighlight && !allInnerTags.length && insertions.size === 0) {
    return renderNonformattedCharacters(span.text);
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
      if (formattingCounters[i]) {
        formattingCounters[i][highlight.color] = {};
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

  // Wrap all the character parts in a single parent span.
  const spanClasses = { monospace, "lumi-span-renderer-element": true };
  return html`<span class=${classMap(spanClasses)}
    >${partsTemplateResults}</span
  >`;
}
