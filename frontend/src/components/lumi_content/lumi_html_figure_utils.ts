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
import katex from 'katex';

export const PLACEHOLDER_PREFIX = '__LATEX_PLACEHOLDER_';

// Captures content (.*?) between $ and $
const KATEK_REGEX = /\$(.*?)\$/g;

/**
 * Pre-processes an HTML string to find LaTeX expressions, replace them with
 * placeholders, and return the modified string along with the extracted LaTeX.
 * This prevents the browser from misinterpreting HTML tags inside LaTeX.
 * @param html The raw HTML string.
 * @returns An object containing the processed HTML and an array of LaTeX strings.
 */
export function preprocessHtmlForKatex(html: string): {
  html: string;
  latex: string[];
} {
  const latex: string[] = [];
  let i = 0;
  const processedHtml = html.replace(KATEK_REGEX, (match, expression) => {
    latex.push(expression);
    return `${PLACEHOLDER_PREFIX}${i++}__`;
  });

  return { html: processedHtml, latex };
}

/**
 * Finds placeholders in a container element and renders the corresponding
 * LaTeX expressions into them.
 * @param container The element to search within.
 * @param latex An array of LaTeX strings corresponding to the placeholders.
 */
export function renderKatexInHtml(container: Element, latex: string[]) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node;
  const nodesToProcess: Node[] = [];
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }

  // Matches prefix_{index}__, capturing the index.
  const placeholderRegex = new RegExp(
    `${PLACEHOLDER_PREFIX}(\\d+)__`,
    /* find all matches */ 'g'
  );

  nodesToProcess.forEach((textNode) => {
    if (
      textNode.textContent &&
      textNode.textContent.includes(PLACEHOLDER_PREFIX)
    ) {
      const parent = textNode.parentNode;
      if (!parent) return;

      const fragments = textNode.textContent.split(placeholderRegex);
      if (fragments.length > 1) {
        const newNodes = document.createDocumentFragment();
        // The split results in an array like:
        // ["text before", "0", "text between", "1", "text after"]
        for (let i = 0; i < fragments.length; i++) {
          const fragment = fragments[i];
          if (i % 2 === 1) {
            // This is a placeholder index (e.g., "0", "1").
            const latexIndex = parseInt(fragment, 10);
            const expression = latex[latexIndex];
            if (expression !== undefined) {
              const span = document.createElement('span');
              try {
                katex.render(expression, span, {
                  throwOnError: false,
                  displayMode: false,
                });
                newNodes.appendChild(span);
              } catch (e) {
                console.error('KaTeX rendering failed:', e);
                // Revert to expression text on failure.
                newNodes.appendChild(document.createTextNode(expression));
              }
            }
          } else if (fragment) {
            // This is regular text.
            newNodes.appendChild(document.createTextNode(fragment));
          }
        }
        parent.replaceChild(newNodes, textNode);
      }
    }
  });
}
