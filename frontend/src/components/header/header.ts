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

import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';

import { core } from '../../core/core';
import {
  DialogService,
  UserFeedbackDialogProps,
} from '../../services/dialog.service';
import { HomeService } from '../../services/home.service';
import { Pages, RouterService } from '../../services/router.service';

import { APP_NAME, LOGO_ICON_NAME } from '../../shared/constants';
import { styles } from './header.scss';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);
  private readonly dialogService = core.getService(DialogService);

  override render() {
    return html`
      <div class="header">
        <div class="left">
          ${this.renderHomeButton()}
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">${this.renderActions()}</div>
      </div>
    `;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.HOME:
        return APP_NAME;
      case Pages.COLLECTION:
        return APP_NAME;
      case Pages.SETTINGS:
        return 'Settings';
      default:
        return '';
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;
    if (activePage === Pages.SETTINGS) {
      return nothing;
    }

    return html`
      ${this.renderFeedbackButton()} ${this.renderSettingsButton()}
      ${this.renderImportButton()}
    `;
  }

  private renderHomeButton() {
    const handleClick = () => {
      this.routerService.navigate(Pages.HOME);
    };

    const activePage = this.routerService.activePage;

    return html`
      <pr-tooltip text="Home" position="BOTTOM_START">
        <pr-icon-button
          color="neutral"
          icon=${activePage === Pages.SETTINGS ? 'arrow_back' : LOGO_ICON_NAME}
          variant="default"
          @click=${handleClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderImportButton() {
    const openDialog = () => {
      this.homeService.setShowUploadDialog(true);
    };

    return html`
      <pr-tooltip text="" position="BOTTOM_END" class="import-button-tooltip">
        <pr-button variant="filled" @click=${openDialog}>
          Import paper
        </pr-button>
      </pr-tooltip>
    `;
  }

  private renderFeedbackButton() {
    const handleClick = () => {
      this.analyticsService.trackAction(
        AnalyticsAction.HOME_HEADER_FEEDBACK_CLICK
      );
      this.dialogService.show(new UserFeedbackDialogProps());
    };

    return html`
      <pr-tooltip text="Send feedback" position="BOTTOM_END">
        <pr-icon-button
          color="neutral"
          icon="feedback"
          variant="default"
          @click=${handleClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderSettingsButton() {
    const handleClick = () => {
      this.routerService.navigate(Pages.SETTINGS);
    };

    return html`
      <pr-tooltip text="Settings" position="BOTTOM_END">
        <pr-icon-button
          color="neutral"
          icon="settings"
          variant="default"
          @click=${handleClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-header': Header;
  }
}
