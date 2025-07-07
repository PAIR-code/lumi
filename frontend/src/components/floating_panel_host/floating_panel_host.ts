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

import "@material/web/menu/menu.js";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing, PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { reaction } from "mobx";

import { core } from "../../core/core";
import {
  FloatingPanelService,
  SmartHighlightMenuProps,
} from "../../services/floating_panel_service";

import type { MdMenu } from "@material/web/menu/menu.js";
import { styles } from "./floating_panel_host.scss";

/**
 * A host component that displays and positions a floating panel using md-menu.
 */
@customElement("floating-panel-host")
export class FloatingPanelHost extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly floatingPanelService = core.getService(FloatingPanelService);
  private readonly menuRef = createRef<MdMenu>();

  private disposer: () => void = () => {};
  protected override firstUpdated(_changedProperties: PropertyValues): void {
    this.disposer = reaction(
      () => this.floatingPanelService.isVisible,
      (isVisible) => {
        if (isVisible) {
          this.openMenu();
        } else {
          this.closeMenu();
        }
      }
    );
  }

  override disconnectedCallback() {
    this.disposer();
    super.disconnectedCallback();
  }

  private openMenu() {
    if (!this.menuRef.value) {
      return;
    }

    const anchorElement = this.floatingPanelService.targetElement;
    if (!anchorElement) return;

    this.menuRef.value.anchorElement = anchorElement;

    if (!this.menuRef.value.open) {
      this.menuRef.value.yOffset = 4;

      window.setTimeout(() => {
        this.menuRef.value?.show();
      });
    }
  }

  private closeMenu() {
    if (this.menuRef.value?.open) {
      this.menuRef.value.close();
    }
  }

  private handleMenuClosed() {
    if (this.floatingPanelService.isVisible) {
      this.floatingPanelService.hide();
    }
  }

  private renderContent() {
    const contentProps = this.floatingPanelService.contentProps;
    if (!contentProps) {
      return nothing;
    }

    if (contentProps instanceof SmartHighlightMenuProps) {
      return html`<div class="panel">
        <smart-highlight-menu .props=${contentProps}></smart-highlight-menu>
      </div>`;
    }

    // Note: Add other cases for different panel content here.

    return nothing;
  }

  override render() {
    return html`
      <span class="menu-wrapper">
        <md-menu
          ${ref(this.menuRef)}
          quick
          @closed=${this.handleMenuClosed}
          positioning="fixed"
          anchor-corner="end-end"
          menu-corner="start-end"
        >
          ${this.renderContent()}
        </md-menu>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "floating-panel-host": FloatingPanelHost;
  }
}
