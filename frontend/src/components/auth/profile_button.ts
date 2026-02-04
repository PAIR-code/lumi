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

import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AppConfigService } from "../../services/app_config.service";
import { AuthService } from "../../services/auth.service";
import {
  FloatingPanelService,
  OverflowMenuProps,
} from "../../services/floating_panel_service";

import { styles } from "./profile_button.scss";

/**
 * A user account button that shows authentication state.
 * When authenticated, shows an icon button that opens an overflow menu.
 * Only renders in internal mode when authentication is enabled.
 */
@customElement("profile-button")
export class ProfileButton extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly appConfigService = core.getService(AppConfigService);
  private readonly authService = core.getService(AuthService);
  private readonly floatingPanelService = core.getService(FloatingPanelService);

  private handleSignOut() {
    this.floatingPanelService.hide();
    this.authService.signOut();
  }

  private handleAccountClick(e: Event) {
    const target = e.currentTarget as HTMLElement;
    const menuProps = new OverflowMenuProps([
      {
        icon: "logout",
        label: "Sign out",
        onClick: () => this.handleSignOut(),
      },
    ]);
    this.floatingPanelService.show(menuProps, target);
  }

  private getTooltipText(): string {
    const name = this.authService.displayName || this.authService.email;
    return name ? `Signed in as ${name}` : "Signed in";
  }

  override render() {
    // Don't render anything if authentication is not enabled
    if (!this.appConfigService.features.authentication) {
      return nothing;
    }

    // Show loading state
    if (this.authService.isLoading) {
      return nothing;
    }

    // Show logged-in state with user icon button
    if (this.authService.isAuthenticated) {
      return html`
        <pr-tooltip text=${this.getTooltipText()} position="BOTTOM_END">
          <pr-icon-button
            class="account-button"
            color="primary"
            icon="account_circle"
            variant="tonal"
            @click=${this.handleAccountClick}
          >
          </pr-icon-button>
        </pr-tooltip>
      `;
    }

    // Not authenticated - don't render (login page handles this)
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-button": ProfileButton;
  }
}
