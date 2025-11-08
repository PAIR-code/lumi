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
import '@material/web/textfield/outlined-text-field.js';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import { core } from '../../../core/core';
import {
  DialogService,
  UserFeedbackDialogProps,
} from '../../../services/dialog.service';
import { FirebaseService } from '../../../services/firebase.service';
import { RouterService } from '../../../services/router.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { saveUserFeedbackCallable } from '../../../shared/callables';
import { styles } from './user_feedback_dialog.scss';
import { TextArea } from '../../../pair-components/textarea';
import { isViewportSmall } from '../../../shared/responsive_utils';

/**
 * The user feedback dialog component.
 */
@customElement('user-feedback-dialog')
export class UserFeedbackDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);
  private readonly snackbarService = core.getService(SnackbarService);

  @query('pr-textarea') private textarea?: TextArea;
  @state() private feedbackText = '';
  @state() private isLoading = false;

  private handleClose() {
    if (this.dialogService) {
      this.dialogService.hide(new UserFeedbackDialogProps());
    }
  }

  private async handleSend() {
    const arxivId =
      this.routerService.activeRoute.params.document_id ?? undefined;

    try {
      this.isLoading = true;
      await saveUserFeedbackCallable(this.firebaseService.functions, {
        userFeedbackText: this.feedbackText,
        arxivId,
      });
      this.snackbarService.show('Feedback sent. Thank you!');
      this.handleClose();
      this.feedbackText = '';
    } catch (e) {
      console.error('Error sending feedback:', e);
      this.snackbarService.show('Error: Could not send feedback.');
    } finally {
      this.isLoading = false;
    }
  }

  private handleOpen() {
    this.updateComplete.then(() => {
      this.textarea?.focusElement();
    });
  }

  private shouldShowDialog() {
    return this.dialogService.dialogProps instanceof UserFeedbackDialogProps;
  }

  override render() {
    return html`
      <pr-dialog
        .showDialog=${this.shouldShowDialog()}
        .onClose=${this.handleClose}
        .onOpen=${() => this.handleOpen()}
      >
        <div slot="title">User Feedback</div>
        <div class="dialog-content">
          <p class="dialog-explanation">
            If you're experiencing an issue and/or have suggestions, we'd love
            to hear from you! You're also welcome to
            <a
              href="https://github.com/PAIR-code/lumi/discussions/categories/feature-requests"
              target="_blank"
              >submit feature requests on Github</a
            >.
          </p>
          <md-outlined-text-field
            ?focused=${true}
            type="textarea"
            rows="5"
            .value=${this.feedbackText}
            ?disabled=${this.isLoading}
            @input=${(e: InputEvent) => {
              this.feedbackText = (e.target as HTMLTextAreaElement).value;
            }}
            placeholder="Add feedback here"
          >
          </md-outlined-text-field>
        </div>
        <div slot="actions-right" class="actions">
          <pr-button
            @click=${() => {
              this.feedbackText = '';
              this.handleClose();
            }}
            variant="default"
            ?disabled=${this.isLoading}
            >Cancel</pr-button
          >
          <pr-button
            @click=${this.handleSend}
            ?loading=${this.isLoading}
            ?disabled=${this.feedbackText.trim() === ''}
          >
            Send
          </pr-button>
        </div>
      </pr-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'user-feedback-dialog': UserFeedbackDialog;
  }
}
