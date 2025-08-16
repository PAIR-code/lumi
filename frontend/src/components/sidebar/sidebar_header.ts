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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styles } from "./sidebar_header.scss";
import { core } from "../../core/core";
import { RouterService, Pages } from "../../services/router.service";
import "../../pair-components/icon_button";
import {
  AnalyticsAction,
  AnalyticsService,
} from "../../services/analytics.service";
import {
  DialogService,
  HistoryDialogProps,
  UserFeedbackDialogProps,
} from "../../services/dialog.service";

/**
 * The header for the sidebar.
 */
@customElement("sidebar-header")
export class SidebarHeader extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly dialogService = core.getService(DialogService);
  private readonly routerService = core.getService(RouterService);

  private handleFeedbackClick() {
    this.analyticsService.trackAction(
      AnalyticsAction.SIDEBAR_HEADER_FEEDBACK_CLICK
    );
    this.dialogService.show(new UserFeedbackDialogProps());
  }

  private openHistoryDialog() {
    this.dialogService.show(new HistoryDialogProps());
  }

  private renderContent() {
    return html`<div class="default-content">
      <div class="left-container">
        <pr-icon-button
          variant="default"
          icon="home"
          @click=${this.navigateHome}
        ></pr-icon-button>
        <div class="title">Lumi</div>
      </div>
      <div class="right-container">
        <pr-icon-button
          title="Open model context"
          icon="contextual_token"
          variant="default"
          @click=${() => {
            this.analyticsService.trackAction(
              AnalyticsAction.HEADER_OPEN_CONTEXT
            );
            this.openHistoryDialog();
          }}
        ></pr-icon-button>
        <pr-icon-button
          title="Send feedback"
          icon="feedback"
          variant="default"
          @click=${this.handleFeedbackClick}
        ></pr-icon-button>
      </div>
    </div>`;
  }

  private navigateHome() {
    this.analyticsService.trackAction(AnalyticsAction.HEADER_NAVIGATE_HOME);
    this.routerService.navigate(Pages.HOME);
  }

  override render() {
    return html` <div class="header-container">${this.renderContent()}</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sidebar-header": SidebarHeader;
  }
}
