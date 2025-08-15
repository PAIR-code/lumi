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

import "./tos_content";
import "../../pair-components/dialog";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { SettingsService } from "../../services/settings.service";

import { styles } from "./project_dialog.scss";

/** Terms of service dialog. */
@customElement("tos-dialog")
export class TosDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly settingsService = core.getService(SettingsService);

  @state() acceptedTOS = false;

  override updated() {
    this.acceptedTOS = this.settingsService.getTOSConfirmed();
  }

  override render() {
    return html`
      <pr-dialog .showDialog=${!this.acceptedTOS} .onClose=${this.closeDialog}>
        ${this.renderTOS()}
      </pr-dialog>
    `;
  }

  closeDialog() {
    this.acceptedTOS = true;
    this.settingsService?.setTOSConfirmed(true);
  }

  renderTOS() {
    if (this.acceptedTOS) {
      return nothing;
    }

    const handleClick = () => {
      this.closeDialog();
    };

    return html`
      <div slot="title">🍭 Welcome to Lumi</div>
      <tos-content></tos-content>
      <div slot="actions-right">
        <pr-button color="tertiary" variant="outlined" @click=${handleClick}>
          Acknowledge
        </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tos-dialog": TosDialog;
  }
}
