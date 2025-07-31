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

import "../../pair-components/dialog";
import "./tos_content";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { SettingsService } from "../../services/settings.service";

import { styles } from "./project_dialog.scss";

/** Project dialog for replacing current project with selected example. */
@customElement("project-dialog")
export class ProjectDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly settingsService = core.getService(SettingsService);

  @state() acceptedTOS = false;

  override updated() {
    if (this.settingsService.getOnboarded()) {
      this.acceptedTOS = true;
    }
  }

  override render() {
    const showDialog = !this.settingsService.getOnboarded();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeDialog();
      }
    };

    return html`
      <pr-dialog .showDialog=${showDialog} @keydown=${handleKeyDown}>
        ${this.renderTOS()}
      </pr-dialog>
    `;
  }

  closeDialog() {
    this.settingsService.setOnboarded(true);
  }

  renderTOS() {
    if (this.acceptedTOS) {
      return nothing;
    }

    const handleClick = () => {
      this.acceptedTOS = true;
      this.closeDialog();
    };

    return html`
      <div class="content">
        <h1>🍭 Welcome to Lumi</h1>
        <tos-content></tos-content>
        <div class="action-buttons">
          <pr-button color="tertiary" variant="outlined" @click=${handleClick}>
            Acknowledge
          </pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "project-dialog": ProjectDialog;
  }
}
