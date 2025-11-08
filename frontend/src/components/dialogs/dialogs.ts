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

import './history_dialog/history_dialog';
import './tutorial_dialog/tutorial_dialog';
import './user_feedback_dialog/user_feedback_dialog';
import '../settings/tos_dialog';

import { MobxLitElement } from '@adobe/lit-mobx';
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { core } from '../../core/core';
import { DialogService } from '../../services/dialog.service';

/**
 * A container component that renders dialogs based on the DialogService state.
 */
@customElement('lumi-dialogs')
export class Dialogs extends MobxLitElement {
  private readonly dialogService = core.getService(DialogService);

  override render() {
    return html`
      <history-dialog></history-dialog>
      <user-feedback-dialog></user-feedback-dialog>
      <tutorial-dialog></tutorial-dialog>
      <tos-dialog></tos-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-dialogs': Dialogs;
  }
}
