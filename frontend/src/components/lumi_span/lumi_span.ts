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

import { html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { consume } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';
import { renderKatex } from '../../directives/katex_directive';

import { scrollContext, ScrollState } from '../../contexts/scroll_context';
import { FocusState, LumiFont } from '../../shared/types';
import {
  HIGHLIGHT_METADATA_ANSWER_KEY,
  CITATION_CLASSNAME,
  FOOTNOTE_CLASSNAME,
} from '../../shared/constants';
import {
  Highlight,
  InnerTagMetadata,
  InnerTagName,
  LumiFootnote,
  LumiReference,
  LumiSpan,
} from '../../shared/lumi_doc';
import { HighlightManager } from '../../shared/highlight_manager';
import { AnswerHighlightManager } from '../../shared/answer_highlight_manager';
import { LumiAnswer } from '../../shared/api';
import { flattenTags } from './lumi_span_utils';

import { styles } from './lumi_span.scss';
import { LightMobxLitElement } from '../light_mobx_lit_element/light_mobx_lit_element';
import { styleMap } from 'lit/directives/style-map.js';
import { areArraysEqual } from '../../shared/utils';

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

const GENERAL_HIGHLIGHT_KEY = 'general_highlight_key';
const COLOR_HIGHLIGHT_KEY = 'highlight_color';

/**
 * A span visualization in the Lumi visualization.
 */
@customElement('lumi-span')
export class LumiSpanViz extends LightMobxLitElement {
  @consume({ context: scrollContext, subscribe: true })
  private scrollContext?: ScrollState;

  private spanRef: Ref<HTMLSpanElement> = createRef();

  // Component properties
  @property({ type: Object }) span!: LumiSpan;
  @property({ type: Boolean }) monospace = false;
  @property({ type: String }) focusState = FocusState.DEFAULT;
  @property({ type: Object }) classMap: { [key: string]: boolean } = {};
  @property({ type: Boolean }) noScrollContext = false;
  @property({ type: Boolean }) showFocusUnderline = false;
  @property({ type: Boolean }) isVirtual = false;
  @property({ type: Boolean }) shouldFadeIn = false;

  // Renderer properties
  @property({ type: Array }) highlights?: Highlight[];
  @property({ type: Array }) references?: LumiReference[];
  @property({ type: Array }) footnotes?: LumiFootnote[];
  @property({ type: Array }) referencedSpans?: LumiSpan[];
  @property({ type: Object }) onReferenceClicked?: (
    referenceId: string
  ) => void;
  @property({ type: Object }) onSpanReferenceClicked?: (
    referenceId: string
  ) => void;
  @property({ type: Object }) onConceptClick?: (
    conceptId: string,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onPaperReferenceClick?: (
    reference: LumiReference,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onFootnoteClick?: (
    footnote: LumiFootnote,
    target: HTMLElement
  ) => void;
  @property({ type: Object }) onAnswerHighlightClick?: (
    answer: LumiAnswer,
    target: HTMLElement
  ) => void;
  @property({ type: String }) font?: LumiFont;

  @state() private renderedContent: TemplateResult | null = null;

  override firstUpdated(_changedProperties: PropertyValues): void {
    this.id = this.span.id;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.noScrollContext) return;

    this.updateComplete.then(() => {
      if (this.spanRef.value && this.span) {
        this.scrollContext?.registerSpan(this.span.id, this.spanRef);
      }
    });
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    const hasHighlightChanges =
      changedProperties.has('highlights') &&
      this.highlights &&
      !areArraysEqual(
        changedProperties.get('highlights') ?? [],
        this.highlights
      );

    if (
      changedProperties.has('span') ||
      hasHighlightChanges ||
      changedProperties.has('references') ||
      changedProperties.has('footnotes') ||
      changedProperties.has('referencedSpans')
    ) {
      this.calculateRenderedContent();
    }
  }

  override disconnectedCallback() {
    if (this.span && !this.noScrollContext) {
      this.scrollContext?.unregisterSpan(this.span.id);
    }
    super.disconnectedCallback();
  }

  private getSpanClassesObject() {
    const classesObject: { [key: string]: boolean } = {
      'outer-span': true,
      'span-fade-in': this.shouldFadeIn,
      monospace: this.monospace,
      focused: this.focusState === FocusState.FOCUSED,
      unfocused: this.focusState === FocusState.UNFOCUSED,
      'show-focus-underline': this.showFocusUnderline,
      ...this.classMap,
    };
    return classesObject;
  }

  private renderEquation(
    equationText: string,
    hasDisplayMathTag: boolean
  ): TemplateResult {
    const equationClasses = classMap({
      ['equation']: true,
      ['display']: hasDisplayMathTag,
    });
    return html`<span
      class=${equationClasses}
      ${renderKatex(equationText, hasDisplayMathTag)}
    ></span>`;
  }

  private renderFormattedCharacter(
    character: string,
    classesAndMetadata: { [key: string]: { [key: string]: any } }
  ): TemplateResult {
    const classesObject: { [key: string]: boolean } = {};
    Object.keys(classesAndMetadata).forEach((key) => {
      classesObject[key] = true;
    });

    if (this.font) {
      classesObject[this.font] = true;
    }

    const highlightMetadata = classesAndMetadata[GENERAL_HIGHLIGHT_KEY];
    if (highlightMetadata) {
      classesObject[highlightMetadata[COLOR_HIGHLIGHT_KEY]] = true;
      if (highlightMetadata[HIGHLIGHT_METADATA_ANSWER_KEY]) {
        classesObject['clickable'] = true;
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
      const href = metadata['href'] || '#';
      // Use a real <a> tag for links.
      return html`<a
        href=${href}
        target="_blank"
        class=${classMap(classesObject)}
        >${character}</a
      >`;
    }

    const onClick = (e: MouseEvent) => {
      if (Object.keys(classesObject).includes(InnerTagName.CONCEPT)) {
        const metadata = classesAndMetadata[InnerTagName.CONCEPT];
        if (metadata['conceptId'] && this.onConceptClick) {
          this.onConceptClick(
            metadata['conceptId'],
            e.currentTarget as HTMLElement
          );
        }
      }

      if (classesAndMetadata[GENERAL_HIGHLIGHT_KEY]) {
        const metadata = classesAndMetadata[GENERAL_HIGHLIGHT_KEY];
        const answer = metadata[HIGHLIGHT_METADATA_ANSWER_KEY];
        if (answer && this.onAnswerHighlightClick) {
          this.onAnswerHighlightClick(
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

  private renderNonformattedCharacters(value: string): TemplateResult {
    const characterClasses: { [key: string]: boolean } = {
      ['character']: true,
    };

    if (this.font) {
      characterClasses[this.font] = true;
    }

    return html`${value
      .split('')
      .map(
        (character) =>
          html`<span class=${classMap(characterClasses)}>${character}</span>`
      )}`;
  }

  private createInsertionsMap() {
    new Map<number, TemplateResult[]>();
    const {
      span,
      references,
      footnotes,
      referencedSpans,
      onPaperReferenceClick,
      onFootnoteClick,
      onSpanReferenceClicked,
    } = this;
    const insertions = new Map<number, TemplateResult[]>();
    // Pre-process tags to create an insertions map.
    span.innerTags.forEach((innerTag) => {
      if (
        innerTag.tagName === InnerTagName.REFERENCE &&
        innerTag.metadata['id'] &&
        references
      ) {
        const refIds = innerTag.metadata['id'].split(',').map((s) => s.trim());
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
        innerTag.metadata['id'] &&
        footnotes
      ) {
        const footnoteId = innerTag.metadata['id'];
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
        innerTag.metadata['id'] &&
        referencedSpans
      ) {
        const refId = innerTag.metadata['id'];
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

  private calculateRenderedContent() {
    const { span, highlights = [], monospace = false } = this;

    if (!span) {
      this.renderedContent = html``;
      return;
    }

    const allHighlights = [...highlights];
    const spanText = span.text;
    const hasHighlight = highlights.length > 0;

    const allInnerTags = flattenTags(span.innerTags || []);

    const insertions = this.createInsertionsMap();

    // Wrap all the character parts in a single parent span.
    const spanClasses = {
      monospace,
      'lumi-span-renderer-element': true,
    };

    // If there are no inner tags or highlights, and no insertions,
    // we can just return the plain text.
    if (!hasHighlight && !allInnerTags.length && insertions.size === 0) {
      this.renderedContent = html`<span class=${classMap(spanClasses)}>
        ${this.renderNonformattedCharacters(span.text)}
      </span>`;
      return;
    }

    // Create an array of objects, one for each character in the span's text.
    // Each object will store the formatting tags (like 'b' for bold, 'i' for
    // italic, or a highlight color) that apply to that character.
    const formattingCounters = spanText
      .split('')
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
    allHighlights.forEach((highlight) => {
      const position = highlight.position;
      // Defaults to the entire span if position is null.
      const startIndex = position ? position.startIndex : 0;
      const endIndex = position ? position.endIndex : this.span.text.length;

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

    let equationText = '';
    // Map over each character of the text to create a list of TemplateResults.
    // Each character will be wrapped in a <span> with the appropriate classes
    // based on the formatting counters we built above.
    const partsTemplateResults = spanText
      .split('')
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
            equationText = '';
            templates.push(
              this.renderEquation(currentEquationText, hasDisplayMathTag)
            );
            return templates;
          }
        }

        // For regular characters, render them with their associated formatting.
        templates.push(
          this.renderFormattedCharacter(char, {
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

    this.renderedContent = html`<span class=${classMap(spanClasses)}
      >${partsTemplateResults}</span
    >`;
  }

  private renderLumiSpan() {
    return this.renderedContent;
  }

  override render() {
    if (this.isVirtual) {
      return html`<span
        ${ref(this.spanRef)}
        id=${this.span.id}
        style=${styleMap({ visibility: 'hidden' })}
      >
        ${this.span.text}
      </span>`;
    }

    return html`
      <style>
        ${styles}
      </style>
      <span
        ${ref(this.spanRef)}
        id=${this.span.id}
        class=${classMap(this.getSpanClassesObject())}
      >
        ${this.renderLumiSpan()}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-span': LumiSpanViz;
  }
}
