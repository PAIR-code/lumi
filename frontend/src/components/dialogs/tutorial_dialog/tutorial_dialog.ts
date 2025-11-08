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
import '../../lumi_image/lumi_image';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';

import { core } from '../../../core/core';
import {
  DialogService,
  TutorialDialogProps,
} from '../../../services/dialog.service';
import { styles } from './tutorial_dialog.scss';
import {
  TUTORIAL_IMAGE_QUESTION_IMAGE_PATH,
  TUTORIAL_QUESTION_IMAGE_PATH,
} from '../../../shared/constants';
import { ApiService } from '../../../services/api.service';
import { SettingsService } from '../../../services/settings.service';

/**
 * The tutorial dialog component.
 */
@customElement('tutorial-dialog')
export class TutorialDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);
  private readonly apiService = core.getService(ApiService);
  private readonly settingsService = core.getService(SettingsService);

  private handleClose() {
    if (this.dialogService) {
      this.dialogService.hide(new TutorialDialogProps());
    }
  }

  private shouldShowDialog() {
    return this.dialogService.dialogProps instanceof TutorialDialogProps;
  }

  private getImageUrl(path: string) {
    // Assets are served directly from backend at /assets/
    // Don't use apiService.getDownloadUrl() which adds /files/ prefix
    const baseUrl = this.apiService['baseUrl'] || 'http://localhost:8001';
    return Promise.resolve(`${baseUrl}/${path}`);
  }

  private renderHideForeverButton() {
    if (!this.dialogService.dialogProps) return nothing;

    // Only show this if it wasn't opened by the user
    if (
      (this.dialogService.dialogProps as TutorialDialogProps).isUserTriggered
    ) {
      return nothing;
    }

    return html`<pr-button
      variant="default"
      @click=${() => {
        this.settingsService.isTutorialConfirmed.value = true;
        this.handleClose();
      }}
    >
      Don't show again
    </pr-button>`;
  }

  override render() {
    return html`
      <pr-dialog
        .onClose=${() => {
          this.handleClose;
        }}
        .showDialog=${this.shouldShowDialog()}
      >
        <div slot="title">✨ Tip: Ask Lumi</div>
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
        <div slot="actions-right" class="actions">
          ${this.renderHideForeverButton()}
          <pr-button
            @click=${() => {
              this.handleClose();
            }}
          >
            Got it!
          </pr-button>
        </div>
      </pr-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tutorial-dialog': TutorialDialog;
  }
}
