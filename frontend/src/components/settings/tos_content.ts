/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { styles } from './tos_content.scss';

/** TOS content. */
@customElement('tos-content')
export class TOSContent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    return html`
      <p>
        Lumi is a research experiment that uses the Gemini API
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank">
          (see Gemini API Terms of Service)</a
        >
        to annotate and answer questions about arXiv papers.
      </p>
      <p>
        All queries to the Gemini API, including freeform text sent through
        Lumi's "smart search" feature, will be logged anonymously, i.e., only
        the exact text you send—not other information such as location, browser,
        or device—will be stored. Please do not enter any sensitive or personal
        information into Lumi. If you would like to request that a query on Lumi
        be removed from storage, please contact
        <a href="mailto:lumi-team@google.com" target="_blank">
          lumi-team@google.com</a
        >
        and include the full text of that query (which can be found in your
        search history).
      </p>
      <p>
        Your search history (including papers you click on and queries you make
        in "smart search") is kept in browser storage on your device and can be
        cleared at any time on the Settings page.
      </p>
      <p>
        This demo was created by
        <a href="https://pair.withgoogle.com/" target="_blank">
          People and AI Research (PAIR)
        </a>
        and follows Google's
        <a href="https://policies.google.com/privacy" target="_blank">
          Privacy Policy</a
        >.
      </p>
      <p>
        Finally, the Lumi code is
        <a href="http://github.com/pair-code/lumi" target="_blank">
          available on GitHub</a
        >.
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tos-content': TOSContent;
  }
}
