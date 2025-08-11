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
import "../../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { MdDialog } from "@material/web/dialog/dialog";
import { CSSResultGroup, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";

import { core } from "../../../core/core";
import {
  DialogService,
  UserFeedbackDialogProps,
} from "../../../services/dialog.service";
import { FirebaseService } from "../../../services/firebase.service";
import { RouterService } from "../../../services/router.service";
import { SnackbarService } from "../../../services/snackbar.service";
import { saveUserFeedbackCallable } from "../../../shared/callables";
import { styles } from "./user_feedback_dialog.scss";
import { TextArea } from "../../../pair-components/textarea";
import { isViewportSmall } from "../../../shared/responsive_utils";

/**
 * The user feedback dialog component.
 */
@customElement("user-feedback-dialog")
export class UserFeedbackDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly dialogService = core.getService(DialogService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);
  private readonly snackbarService = core.getService(SnackbarService);

  @query("md-dialog") private readonly dialog!: MdDialog;
  @query("pr-textarea") private textarea?: TextArea;
  @state() private feedbackText = "";
  @state() private isLoading = false;

  private handleClose() {
    this.dialogService.hide();
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
      this.snackbarService.show("Feedback sent. Thank you!");
      this.dialog.close();
      this.feedbackText = "";
    } catch (e) {
      console.error("Error sending feedback:", e);
      this.snackbarService.show("Error: Could not send feedback.");
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
    const textareaSize = isViewportSmall() ? "medium" : "small";

    return html`
      <md-dialog
        @close=${this.handleClose}
        .open=${this.shouldShowDialog()}
        @opened=${() => this.handleOpen()}
      >
        <div slot="headline">User Feedback</div>
        <div slot="content" class="content">
          <p class="dialog-explanation">
            Have feedback or encountered an issue? We'd love to hear from you.
          </p>
          <pr-textarea
            .value=${this.feedbackText}
            variant="outlined"
            size=${textareaSize}
            @change=${(e: CustomEvent) => {
              this.feedbackText = e.detail.value;
            }}
            placeholder="Leave your feedback..."
          >
          </pr-textarea>
        </div>
        <div slot="actions">
          <pr-button
            @click=${() => {
              this.feedbackText = "";
              this.dialog.close();
            }}
            variant="default"
            ?disabled=${this.isLoading}
            >Cancel</pr-button
          >
          <pr-button
            @click=${this.handleSend}
            ?loading=${this.isLoading}
            ?disabled=${this.feedbackText.trim() === ""}
          >
            Send
          </pr-button>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "user-feedback-dialog": UserFeedbackDialog;
  }
}
