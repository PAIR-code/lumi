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

import "@material/web/dialog/dialog";
import "../../../pair-components/button";
import "../../history_view/history_view";

import { MobxLitElement } from "@adobe/lit-mobx";
import { MdDialog } from "@material/web/dialog/dialog";
import { CSSResultGroup, html } from "lit";
import { customElement, query } from "lit/decorators.js";

import { core } from "../../../core/core";
import {
  DialogService,
  HistoryDialogProps,
} from "../../../services/dialog.service";
import { styles } from "./history_dialog.scss";

/**
 * The history dialog component.
 */
@customElement("history-dialog")
export class HistoryDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);

  @query("md-dialog") private readonly dialog!: MdDialog;

  private handleClose() {
    this.dialogService.hide();
  }

  private shouldShowDialog() {
    return this.dialogService.dialogProps instanceof HistoryDialogProps;
  }

  override render() {
    return html`
      <md-dialog @close=${this.handleClose} .open=${this.shouldShowDialog()}>
        <div slot="headline">History</div>
        <div slot="content">
          <p class="dialog-explanation">
            This is the list of papers and queries included as context for the
            model:
          </p>
          <history-view></history-view>
        </div>
        <div slot="actions">
          <pr-button @click=${() => this.dialog.close()}> Close </pr-button>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "history-dialog": HistoryDialog;
  }
}
