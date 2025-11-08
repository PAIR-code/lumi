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

import './pair-components/button';
import './components/gallery/home_gallery';
import './components/header/header';
import './components/settings/settings';
import './components/lumi_reader/lumi_reader';
import './components/floating_panel_host/floating_panel_host';
import './components/smart_highlight_menu/smart_highlight_menu';
import './components/dialogs/dialogs';
import './components/banner/banner';
import 'lit-toast/lit-toast.js';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

import { core } from './core/core';
import { Pages, RouterService } from './services/router.service';
import { SettingsService } from './services/settings.service';
import { SnackbarService } from './services/snackbar.service';
import { BannerService } from './services/banner.service';
import { BANNER_HEIGHT } from './components/banner/banner';

import { styles } from './app.scss';
import { LightMobxLitElement } from './components/light_mobx_lit_element/light_mobx_lit_element';

import { GalleryView } from './shared/types';

/** App main component. */
@customElement('lumi-app')
export class App extends LightMobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly bannerService = core.getService(BannerService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly snackbarService = core.getService(SnackbarService);

  private readonly toastRef: Ref<any> = createRef<any>();

  override connectedCallback() {
    super.connectedCallback();
  }

  override firstUpdated() {
    this.snackbarService.setToast(this.toastRef);
  }

  private renderPageContent() {
    const params = this.routerService.activeRoute.params;

    switch (this.routerService.activePage) {
      case Pages.HOME:
        return this.renderGallery();
      case Pages.SETTINGS:
        return html`
          <page-header></page-header>
          <div class="content info">
            <settings-page></settings-page>
          </div>
        `;
      case Pages.COLLECTION:
        return this.renderGallery(GalleryView.CURRENT);
      case Pages.ARXIV_DOCUMENT:
        return html`
          <lumi-reader documentId=${params.document_id}></lumi-reader>
        `;
      default:
        return this.render404();
    }
  }

  private renderGallery(galleryView: GalleryView = GalleryView.LOCAL) {
    return html`
      <page-header></page-header>
      <home-gallery-tabs></home-gallery-tabs>
      <div class="content">
        <home-gallery .galleryView=${galleryView}></home-gallery>
      </div>
    `;
  }

  private render404(message = 'Page not found') {
    return html`<div class="content">404: ${message}</div>`;
  }

  private renderBanner() {
    if (!this.bannerService.isBannerOpen) {
      return nothing;
    }
    const bannerProperties = this.bannerService.getBannerProperties()!;

    return html`
      <lumi-banner
        .text=${bannerProperties.message}
        .icon=${bannerProperties.icon}
        .actionText=${bannerProperties.actionText}
        .actionCallback=${bannerProperties.actionCallback}
        .onBannerClose=${bannerProperties.closeCallback}
      >
      </lumi-banner>
    `;
  }

  override render() {
    const mainStyles = styleMap({
      height: this.bannerService.isBannerOpen
        ? `calc(100% - ${BANNER_HEIGHT}px)`
        : '100%',
    });

    return html`
      <style>
        ${styles}
      </style>
      <div class="app-wrapper mode--${this.settingsService.colorMode}">
        ${this.renderBanner()}
        <main style=${mainStyles}>
          <div class="content-wrapper">${this.renderPageContent()}</div>
          <floating-panel-host></floating-panel-host>
          <lumi-dialogs></lumi-dialogs>
          <lit-toast ${ref(this.toastRef)}></lit-toast>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lumi-app': App;
  }
}
