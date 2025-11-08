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

import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { core } from '../../core/core';
import { FirebaseService } from '../../services/firebase.service';
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from '../../services/router.service';

import { APP_NAME } from '../../shared/constants';

import { styles } from './sidenav.scss';

/** Sidenav menu component */
@customElement('sidenav-menu')
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const toggleNav = () => {
      this.routerService.setNav(!this.routerService.isNavOpen);
    };

    const navClasses = classMap({
      'nav-wrapper': true,
      closed: !this.routerService.isNavOpen,
    });

    const renderTitle = () => {
      if (this.routerService.isNavOpen) {
        return html`<div class="title">${APP_NAME}</div>`;
      }
      return nothing;
    };

    return html`
      <div class=${navClasses}>
        <div class="top">
          <div class="menu-title" role="button" @click=${toggleNav}>
            <pr-icon class="icon" color="secondary" icon="menu"></pr-icon>
            ${renderTitle()}
          </div>
          ${NAV_ITEMS.filter((navItem) => navItem.isPrimaryPage).map(
            (navItem) => this.renderNavItem(navItem)
          )}
        </div>
        <div class="bottom">
          ${NAV_ITEMS.filter((navItem) => !navItem.isPrimaryPage).map(
            (navItem) => this.renderNavItem(navItem)
          )}
        </div>
      </div>
    `;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (e: Event) => {
      this.routerService.navigate(navItem.page);
    };

    return html`
      <div class=${navItemClasses} role="button" @click=${handleNavItemClicked}>
        <pr-icon class="icon" icon=${navItem.icon}></pr-icon>
        ${this.routerService.isNavOpen ? navItem.title : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sidenav-menu': SideNav;
  }
}
