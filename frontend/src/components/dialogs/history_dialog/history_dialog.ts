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

import '../../../pair-components/dialog';
import '../../../pair-components/button';
import '../../settings/reading_history';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { core } from '../../../core/core';
import {
  DialogService,
  HistoryDialogProps,
} from '../../../services/dialog.service';
import { styles } from './history_dialog.scss';

/**
 * The history dialog component.
 */
@customElement('history-dialog')
export class HistoryDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);

  private handleClose() {
    if (this.dialogService) {
      this.dialogService.hide(new HistoryDialogProps());
    }
  }

  private shouldShowDialog() {
    return this.dialogService.dialogProps instanceof HistoryDialogProps;
  }

  override render() {
    return html`
      <pr-dialog
        .onClose=${this.handleClose.bind(this)}
        .showDialog=${this.shouldShowDialog()}
        showCloseButton
      >
        <div slot="title">Reading History</div>
        <div>
          <p class="dialog-explanation">
            The following papers are included as context for the model when
            generating personalized paper-level summaries:
          </p>
          <reading-history></reading-history>
        </div>
      </pr-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'history-dialog': HistoryDialog;
  }
}
