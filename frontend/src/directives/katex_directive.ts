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
// katex-directive.ts
import {
  Directive,
  directive,
  ElementPart,
  PartInfo,
  PartType,
} from 'lit/directive.js';
import katex from 'katex';

function makeErrorSpan(equationText: string, error: Error) {
  const span = document.createElement('span');
  span.innerText = 'error';
  span.style.background = '#ffcfc9'; // $error87
  span.style.color = '#690005'; // $error20
  span.style.borderRadius = '8px';
  span.style.padding = '4px 8px';
  span.style.fontSize = '11px';
  span.style.fontFamily = 'Inter';
  span.style.height = '100%';
  span.style.cursor = 'pointer';
  span.title = error.toString();

  span.onclick = () => {
    span.innerText = equationText;
    span.style.background = 'unset';
  };

  return span;
}

// This directive can be attached to an element and will render the equation param as
// LaTeX within the element using the KaTeX library.
class KatexDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    // Ensure this directive is used on an element part (e.g., <div ${...}>)
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('The `katex` directive must be used in an element part.');
    }
  }

  render(equationText: string, displayMode: boolean) {
    // This method is primarily for directives that return a value to be rendered.
    // We will perform our side-effect in the `update` method.
  }

  // The `update` method is the core. Lit calls it when the element is first
  // rendered and whenever the directive's value changes.
  update(part: ElementPart, [equationText, displayMode]: [string, boolean]) {
    // `part.element` is the DOM element the directive is attached to.
    // By the time `update` is called, this element is guaranteed to exist.
    try {
      katex.render(equationText, part.element as HTMLElement, {
        throwOnError: true,
        displayMode,
      });
    } catch (error) {
      part.element.appendChild(makeErrorSpan(equationText, error as Error));
    }
  }
}

export const renderKatex = directive(KatexDirective);
