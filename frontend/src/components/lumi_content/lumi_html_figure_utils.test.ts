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

import { expect } from '@esm-bundle/chai';
import * as sinon from 'sinon';
import {
  preprocessHtmlForKatex,
  renderKatexInHtml,
  PLACEHOLDER_PREFIX,
} from './lumi_html_figure_utils';
import katex from 'katex';

describe('preprocessHtmlForKatex', () => {
  it('should extract a single LaTeX expression and replace it with a placeholder', () => {
    const html = 'This is a formula: $E=mc^2$';
    const { html: processedHtml, latex } = preprocessHtmlForKatex(html);
    expect(latex).to.deep.equal(['E=mc^2']);
    expect(processedHtml).to.equal(
      `This is a formula: ${PLACEHOLDER_PREFIX}0__`
    );
  });

  it('should handle multiple LaTeX expressions', () => {
    const html = 'One: $a+b$. Two: $c+d$.';
    const { html: processedHtml, latex } = preprocessHtmlForKatex(html);
    expect(latex).to.deep.equal(['a+b', 'c+d']);
    expect(processedHtml).to.equal(
      `One: ${PLACEHOLDER_PREFIX}0__. Two: ${PLACEHOLDER_PREFIX}1__.`
    );
  });

  it('should handle HTML tags within the LaTeX expression', () => {
    const html = 'Problematic formula: $a<b>c$';
    const { html: processedHtml, latex } = preprocessHtmlForKatex(html);
    expect(latex).to.deep.equal(['a<b>c']);
    expect(processedHtml).to.equal(
      `Problematic formula: ${PLACEHOLDER_PREFIX}0__`
    );
  });

  it('should return an empty array if no LaTeX is present', () => {
    const html = 'Just plain text.';
    const { html: processedHtml, latex } = preprocessHtmlForKatex(html);
    expect(latex).to.be.empty;
    expect(processedHtml).to.equal(html);
  });
});

describe('renderKatexInHtml', () => {
  let container: HTMLElement;
  let katexRenderStub: sinon.SinonStub;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    katexRenderStub = sinon.stub(katex, 'render');
    katexRenderStub.callsFake((str: string, el: HTMLElement) => {
      if (str.includes('\\invalid')) {
        throw new Error('Invalid KaTeX');
      }
      el.innerHTML = `K[${str}]`;
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    sinon.restore();
  });

  it('should replace a single placeholder with a rendered KaTeX span', () => {
    container.innerHTML = `This is a formula: ${PLACEHOLDER_PREFIX}0__`;
    renderKatexInHtml(container, ['E=mc^2']);
    expect(container.innerHTML).to.equal(
      'This is a formula: <span>K[E=mc^2]</span>'
    );
  });

  it('should replace multiple placeholders', () => {
    container.innerHTML = `One: ${PLACEHOLDER_PREFIX}0__. Two: ${PLACEHOLDER_PREFIX}1__.`;
    renderKatexInHtml(container, ['a^2+b^2=c^2', 'x+y=z']);
    expect(container.innerHTML).to.equal(
      'One: <span>K[a^2+b^2=c^2]</span>. Two: <span>K[x+y=z]</span>.'
    );
  });

  it('should not change content if no placeholders are present', () => {
    const initialHtml = 'This is some text without any formulas.';
    container.innerHTML = initialHtml;
    renderKatexInHtml(container, []);
    expect(container.innerHTML).to.equal(initialHtml);
  });

  it('should handle invalid KaTeX syntax gracefully', () => {
    const consoleErrorSpy = sinon.spy(console, 'error');
    container.innerHTML = `Invalid formula: ${PLACEHOLDER_PREFIX}0__`;
    const invalidExpression = '\\invalid';
    renderKatexInHtml(container, [invalidExpression]);
    // It should revert to the original placeholder text
    expect(container.innerHTML).to.equal(
      `Invalid formula: ${invalidExpression}`
    );
    expect(consoleErrorSpy.called).to.be.true;
    consoleErrorSpy.restore();
  });

  it('should handle multiple text nodes with placeholders correctly', () => {
    container.innerHTML = `<p>First: ${PLACEHOLDER_PREFIX}0__</p><p>No formula.</p><div>Another: ${PLACEHOLDER_PREFIX}1__</div>`;
    renderKatexInHtml(container, ['a+b', 'c+d']);

    expect((container.children[0] as HTMLElement)!.innerHTML).to.equal(
      'First: <span>K[a+b]</span>'
    );
    expect(container.children[1]!.innerHTML).to.equal('No formula.');
    expect(container.children[2]!.innerHTML).to.equal(
      'Another: <span>K[c+d]</span>'
    );
  });
});
