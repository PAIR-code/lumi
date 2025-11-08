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

import { observable } from 'mobx';

import { AnalyticsService } from './analytics.service';
import { FirebaseService } from './firebase.service';
import { RouterService } from './router.service';
import { Service } from './service';
import { HistoryService } from './history.service';

interface ServiceProvider {
  analyticsService: AnalyticsService;
  firebaseService: FirebaseService;
  historyService: HistoryService;
  routerService: RouterService;
}

export class InitializationService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
  }

  @observable isAppInitialized = false;

  override async initialize() {
    this.sp.analyticsService.initialize();
    this.sp.firebaseService.initialize();
    // Initialize HistoryService BEFORE RouterService so papers are loaded from localStorage
    // before HomeService tries to read them
    this.sp.historyService.initialize();
    this.sp.routerService.initialize();

    this.isAppInitialized = true;
  }
}
