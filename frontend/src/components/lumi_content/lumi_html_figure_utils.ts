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
import katex from "katex";

export function renderKatexInHtml(container: Element) {
  // Use a TreeWalker to efficiently find all text nodes.
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node;
  const nodesToProcess: Node[] = [];
  // Collect all text nodes first, as modifying the DOM while iterating can be problematic.
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }

  // Regex to find content between $...$
  const katexRegex = /\$(.*?)\$/g;

  nodesToProcess.forEach((textNode) => {
    if (textNode.textContent && textNode.textContent.includes("$")) {
      const parent = textNode.parentNode;
      if (!parent) return;

      const fragments = textNode.textContent.split(katexRegex);
      // If there are no matches, fragments will have 1 element.
      // For each match, it will add two more elements (the latex, and the text after).
      // e.g., "text $$a$$ text" -> ["text ", "a", " text"]
      if (fragments.length > 1) {
        const newNodes = document.createDocumentFragment();
        fragments.forEach((fragment, i) => {
          if (i % 2 === 1) {
            const span = document.createElement("span");
            try {
              katex.render(fragment, span, {
                throwOnError: false,
                displayMode: false,
              });
              newNodes.appendChild(span);
            } catch (e) {
              console.error("KaTeX rendering failed:", e);
              newNodes.appendChild(document.createTextNode(`$${fragment}$`));
            }
          } else if (fragment) {
            // This is regular text.
            newNodes.appendChild(document.createTextNode(fragment));
          }
        });
        // Replace the original text node with the new set of nodes.
        parent.replaceChild(newNodes, textNode);
      }
    }
  });
}
