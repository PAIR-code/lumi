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

import "../../../pair-components/dialog";
import "../../../pair-components/button";
import "../../lumi_image/lumi_image";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../../core/core";
import {
  DialogService,
  TutorialDialogProps,
} from "../../../services/dialog.service";
import { styles } from "./tutorial_dialog.scss";
import {
  TUTORIAL_IMAGE_QUESTION_IMAGE_PATH,
  TUTORIAL_QUESTION_IMAGE_PATH,
} from "../../../shared/constants";
import { FirebaseService } from "../../../services/firebase.service";

/**
 * The tutorial dialog component.
 */
@customElement("tutorial-dialog")
export class TutorialDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);
  private readonly firebaseService = core.getService(FirebaseService);

  private handleClose() {
    this.dialogService.hide();
  }

  private shouldShowDialog() {
    return this.dialogService.dialogProps instanceof TutorialDialogProps;
  }

  private getImageUrl(path: string) {
    return this.firebaseService.getDownloadUrl(path);
  }

  override render() {
    return html`
      <pr-dialog
        .onClose=${this.handleClose}
        .showDialog=${this.shouldShowDialog()}
      >
        <div slot="title">Asking Lumi Questions...</div>
        <div>
          <p class="dialog-explanation">
            Try selecting some text or clicking an image:
          </p>
          <div class="images">
            <lumi-image
              class="tutorial-image"
              .storagePath=${TUTORIAL_QUESTION_IMAGE_PATH}
              .getImageUrl=${this.getImageUrl.bind(this)}
            ></lumi-image>
            <lumi-image
              class="tutorial-image"
              .storagePath=${TUTORIAL_IMAGE_QUESTION_IMAGE_PATH}
              .getImageUrl=${this.getImageUrl.bind(this)}
            ></lumi-image>
          </div>
        </div>
        <div slot="actions-right">
          <pr-button @click=${() => this.handleClose()}> Got it! </pr-button>
        </div>
      </pr-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tutorial-dialog": TutorialDialog;
  }
}
