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

import { Core } from './core/core';
import { AnalyticsService } from './services/analytics.service';
import { ApiService } from './services/api.service';
import { BannerService } from './services/banner.service';
import { DialogService } from './services/dialog.service';
import { DocumentStateService } from './services/document_state.service';
import { FirebaseService } from './services/firebase.service';
import { FloatingPanelService } from './services/floating_panel_service';
import { HistoryService } from './services/history.service';
import { HomeService } from './services/home.service';
import { InitializationService } from './services/initialization.service';
import { LocalStorageService } from './services/local_storage.service';
import { RouterService } from './services/router.service';
import { SnackbarService } from './services/snackbar.service';
import { SettingsService } from './services/settings.service';

/**
 * Defines a map of services to their identifier
 */
export function makeServiceProvider(self: Core) {
  const serviceProvider = {
    get analyticsService() {
      return self.getService(AnalyticsService);
    },
    get apiService() {
      return self.getService(ApiService);
    },
    get bannerService() {
      return self.getService(BannerService);
    },
    get dialogService() {
      return self.getService(DialogService);
    },
    get documentStateService() {
      return self.getService(DocumentStateService);
    },
    get firebaseService() {
      return self.getService(FirebaseService);
    },
    get floatingPanelService() {
      return self.getService(FloatingPanelService);
    },
    get historyService() {
      return self.getService(HistoryService);
    },
    get homeService() {
      return self.getService(HomeService);
    },
    get initializationService() {
      return self.getService(InitializationService);
    },
    get localStorageService() {
      return self.getService(LocalStorageService);
    },
    get routerService() {
      return self.getService(RouterService);
    },
    get settingsService() {
      return self.getService(SettingsService);
    },
    get snackbarService() {
      return self.getService(SnackbarService);
    },
  };

  return serviceProvider;
}
