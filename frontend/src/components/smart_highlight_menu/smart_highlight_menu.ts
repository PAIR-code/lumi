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
import { CSSResultGroup, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { core } from '../../core/core';
import {
  FloatingPanelService,
  SmartHighlightMenuProps,
} from '../../services/floating_panel_service';

import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textinput';

import { styles } from './smart_highlight_menu.scss';
import { TextInput } from '../../pair-components/textinput';
import {
  AnalyticsAction,
  AnalyticsService,
} from '../../services/analytics.service';
import {
  INPUT_DEBOUNCE_MS,
  MAX_QUERY_INPUT_LENGTH,
} from '../../shared/constants';
import { debounce } from '../../shared/utils';
import { HistoryService } from '../../services/history.service';
import { isViewportSmall } from '../../shared/responsive_utils';

/**
 * The menu that appears on text selection.
 */
@customElement('smart-highlight-menu')
export class SmartHighlightMenu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly historyService = core.getService(HistoryService);

  @property({ type: Object }) props!: SmartHighlightMenuProps;

  @state() private isAsking = false; // If true, shows the `asking questions` UI
  @state() private queryText = '';
  @query('pr-textinput') private textInput?: TextInput;

  private handleDefineClick() {
    this.analyticsService.trackAction(AnalyticsAction.MENU_EXPLAIN_CLICK);
    this.props.onDefine(
      this.props.selectedText,
      this.props.highlightedSpans,
      this.props.imageInfo
    );
    this.floatingPanelService.hide();
  }

  private handleAskClick() {
    this.analyticsService.trackAction(AnalyticsAction.MENU_ASK_CLICK);
    this.isAsking = true;
    this.updateComplete.then(() => {
      this.textInput?.focus();
    });
  }

  private handleSendClick() {
    this.analyticsService.trackAction(AnalyticsAction.MENU_SEND_QUERY);
    this.props.onAsk(
      this.props.selectedText,
      this.queryText,
      this.props.highlightedSpans,
      this.props.imageInfo
    );
    this.floatingPanelService.hide();
  }

  private renderDefaultView() {
    const explainButtonName = this.props.imageInfo
      ? 'Explain image'
      : 'Explain text';
    return html`
      <pr-button
        variant="default"
        color="tertiary"
        @click=${this.handleDefineClick}
        ?disabled=${this.historyService.isAnswerLoading}
        >${explainButtonName}</pr-button
      >
      <div class="divider"></div>
      <pr-button
        variant="default"
        color="tertiary"
        @click=${this.handleAskClick}
        ?disabled=${this.historyService.isAnswerLoading}
        >Ask Lumi...</pr-button
      >
    `;
  }

  private debouncedUpdate = debounce((value: string) => {
    this.queryText = value;
  }, INPUT_DEBOUNCE_MS);

  private renderAskView() {
    const inputSize = isViewportSmall() ? 'medium' : 'small';
    return html`
      <pr-textinput
        size=${inputSize}
        .value=${this.queryText}
        .onChange=${(e: InputEvent) => {
          this.debouncedUpdate((e.target as HTMLInputElement).value);
        }}
        .onKeydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter') this.handleSendClick();
        }}
        ?disabled=${this.historyService.isAnswerLoading}
        placeholder="Ask Lumi"
        .maxLength=${MAX_QUERY_INPUT_LENGTH}
        color="tertiary"
      ></pr-textinput>
      <pr-icon-button
        icon="send"
        color="tertiary"
        ?disabled=${!this.queryText || this.historyService.isAnswerLoading}
        @click=${this.handleSendClick}
        variant="default"
      ></pr-icon-button>
    `;
  }

  override render() {
    const classes = {
      'smart-highlight-menu': true,
      'is-asking': this.isAsking,
    };

    return html`
      <div class=${classMap(classes)}>
        ${this.isAsking ? this.renderAskView() : this.renderDefaultView()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'smart-highlight-menu': SmartHighlightMenu;
  }
}
