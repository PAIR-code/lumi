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
import { DocumentStateService } from "../../services/document_state.service";
import { FirebaseService } from "../../services/firebase.service";
import { HistoryService } from "../../services/history.service";
import { LumiAnswerRequest } from "../../shared/api";
import { createTemporaryAnswer } from "../../shared/answer_utils";
import { getLumiResponseCallable } from "../../shared/callables";
import { SnackbarService } from "../../services/snackbar.service";

/**
 * The header for the sidebar.
 */
@customElement("sidebar-header")
export class SidebarHeader extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly routerService = core.getService(RouterService);
  private readonly documentStateService = core.getService(DocumentStateService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly historyService = core.getService(HistoryService);
  private readonly snackbarService = core.getService(SnackbarService);

  @property({ type: Object }) onHistoryClick = () => {};
  @state() private isSearchOpen = false;
  @state() private query = "";

  private openSearch() {
    this.isSearchOpen = true;
  }

  private closeSearch() {
    this.isSearchOpen = false;
  }

  private async handleSearch() {
    const lumiDoc = this.documentStateService.lumiDocManager?.lumiDoc;

    if (!this.query || !lumiDoc || this.historyService.isAnswerLoading) {
      return;
    }

    const docId = this.routerService.getActiveRouteParams()["document_id"];

    const request: LumiAnswerRequest = {
      query: this.query,
      // TODO(ellenj): Update question-answering to make use of history.
      history: [],
    };

    const tempAnswer = createTemporaryAnswer(request);
    this.historyService.addTemporaryAnswer(tempAnswer);
    const queryToClear = this.query;

    try {
      const response = await getLumiResponseCallable(
        this.firebaseService.functions,
        lumiDoc,
        request
      );
      this.historyService.addAnswer(docId, response);
      this.query = "";
    } catch (e) {
      console.error("Error getting Lumi response:", e);
      this.snackbarService.show("Error: Could not get response from Lumi.");
    } finally {
      this.historyService.removeTemporaryAnswer(tempAnswer.id);
      if (this.query === queryToClear) {
        this.query = "";
      }
    }
  }

  private renderSearch() {
    const isLoading = this.historyService.isAnswerLoading;

    return html`
      <div class="input-container">
        <pr-icon-button
          title="Open model context"
          icon="contextual_token"
          .loading=${isLoading}
          variant="default"
          @click=${this.onHistoryClick}
        ></pr-icon-button>
        <pr-textarea
          .focused=${true}
          .value=${this.query}
          .onChange=${(e: InputEvent) =>
            (this.query = (e.target as HTMLInputElement).value)}
          .onKeydown=${(e: KeyboardEvent) => {
            if (e.key === "Enter") this.handleSearch();
          }}
          placeholder="Ask Lumi"
          class="search-input"
          ?disabled=${isLoading}
        ></pr-textarea>
        <pr-icon-button
          title="Ask Lumi"
          icon="search"
          ?disabled=${!this.query || isLoading}
          .loading=${isLoading}
          @click=${this.handleSearch}
          variant="outlined"
        ></pr-icon-button>
        <pr-icon-button
          title="Close"
          icon="close"
          ?disabled=${isLoading}
          @click=${this.closeSearch}
          variant="outlined"
        ></pr-icon-button>
      </div>
    `;
  }

  private renderDefaultContent() {
    return html`<div class="default-content">
      <div class="left-container">
        <pr-icon-button
          variant="default"
          icon="home"
          @click=${this.navigateHome}
        ></pr-icon-button>
        <div class="title">Lumi</div>
      </div>
      <pr-icon-button
        icon="search"
        variant="outlined"
        @click=${this.openSearch}
      ></pr-icon-button>
    </div>`;
  }

  private renderContent() {
    if (this.isSearchOpen) {
      return this.renderSearch();
    }

    return this.renderDefaultContent();
  }

  private navigateHome() {
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
