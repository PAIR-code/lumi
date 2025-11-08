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

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styles } from './sidebar_header.scss';
import { core } from '../../core/core';
import { RouterService, Pages } from '../../services/router.service';
import { APP_NAME, LOGO_ICON_NAME } from '../../shared/constants';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';
import {
  DialogService,
  HistoryDialogProps,
  TutorialDialogProps,
  UserFeedbackDialogProps,
} from '../../services/dialog.service';
import {
  FloatingPanelService,
  OverflowMenuItem,
  OverflowMenuProps,
} from '../../services/floating_panel_service';

/**
 * The header for the sidebar.
 */
@customElement('sidebar-header')
export class SidebarHeader extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly dialogService = core.getService(DialogService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly routerService = core.getService(RouterService);

  @property({ type: Boolean }) includeAppName = false;

  private handleFeedbackClick() {
    this.floatingPanelService.hide();
    this.analyticsService.trackAction(
      AnalyticsAction.SIDEBAR_HEADER_FEEDBACK_CLICK
    );
    this.dialogService.show(new UserFeedbackDialogProps());
  }

  private onSeeHistoryClick() {
    this.floatingPanelService.hide();
    this.analyticsService.trackAction(
      AnalyticsAction.SIDEBAR_HEADER_HISTORY_CLICK
    );
    this.dialogService.show(new HistoryDialogProps());
  }

  private handleTutorialClick() {
    this.floatingPanelService.hide();
    this.analyticsService.trackAction(
      AnalyticsAction.SIDEBAR_HEADER_TUTORIAL_CLICK
    );
    this.dialogService.show(
      new TutorialDialogProps(/* isUserTriggered */ true)
    );
  }

  private handleOverflowClick(e: Event) {
    const menuItems: OverflowMenuItem[] = [
      {
        icon: 'contextual_token',
        label: 'View Lumi history',
        onClick: this.onSeeHistoryClick.bind(this),
      },
      {
        icon: 'feedback',
        label: 'Send feedback',
        onClick: this.handleFeedbackClick.bind(this),
      },
      {
        icon: 'help',
        label: 'Tutorial',
        onClick: this.handleTutorialClick.bind(this),
      },
    ];
    const props = new OverflowMenuProps(menuItems);
    this.floatingPanelService.show(props, e.currentTarget as HTMLElement);
  }

  private renderContent() {
    return html`<div class="default-content">
      <div class="left-container">
        <pr-tooltip text="Lumi home" position="RIGHT">
          <pr-icon-button
            variant="default"
            icon=${LOGO_ICON_NAME}
            @click=${this.navigateHome}
          ></pr-icon-button>
        </pr-tooltip>
        ${this.includeAppName
          ? html`<div class="title">${APP_NAME}</div>`
          : nothing}
      </div>
      <slot></slot>
      <div class="right-container">
        <pr-icon-button
          title="More options"
          icon="more_vert"
          variant="default"
          @click=${this.handleOverflowClick}
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
    'sidebar-header': SidebarHeader;
  }
}
