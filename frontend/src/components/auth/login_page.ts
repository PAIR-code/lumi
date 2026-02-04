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

import "../../pair-components/button";
import "../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth.service";
import { APP_NAME } from "../../shared/constants";

import { styles } from "./login_page.scss";

/**
 * Full-screen login page shown when user is not authenticated in internal mode.
 */
@customElement("login-page")
export class LoginPage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  private handleLogin() {
    this.authService.signInWithGoogle();
  }

  override render() {
    return html`
      <div class="login-page">
        <div class="login-card">
          <div class="header">
            <h1>${APP_NAME}</h1>
            <p class="subtitle">Internal Lumi for Research</p>
          </div>
          ${this.authService.isLoading
            ? html`<p class="loading">Loading...</p>`
            : html`
                <pr-button
                  variant="filled"
                  size="small"
                  @click=${this.handleLogin}
                >
                  Sign in with Google
                </pr-button>
              `}
          ${this.authService.error
            ? html`<p class="error">${this.authService.error}</p>`
            : ""}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "login-page": LoginPage;
  }
}
