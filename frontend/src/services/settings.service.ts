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

import { action, makeObservable, observable } from 'mobx';
import { Service } from './service';

import { ColorMode } from '../shared/types';

import {
  LocalStorageHelper,
  LocalStorageService,
} from './local_storage.service';

interface ServiceProvider {
  localStorageService: LocalStorageService;
}

const TOS_CONFIRMED_LOCAL_STORAGE_KEY = 'tosConfirmed';
const TUTORIAL_CONFIRMED_LOCAL_STORAGE_KEY = 'tutorialConfirmed';
const API_KEY_LOCAL_STORAGE_KEY = 'userApiKey';

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    this.isTosConfirmed = this.sp.localStorageService.makeLocalStorageHelper(
      TOS_CONFIRMED_LOCAL_STORAGE_KEY,
      false
    );
    this.isTutorialConfirmed =
      this.sp.localStorageService.makeLocalStorageHelper(
        TUTORIAL_CONFIRMED_LOCAL_STORAGE_KEY,
        false
      );
    this.apiKey = this.sp.localStorageService.makeLocalStorageHelper(
      API_KEY_LOCAL_STORAGE_KEY,
      ''
    );
  }

  @observable colorMode: ColorMode = ColorMode.DEFAULT;

  readonly isTosConfirmed: LocalStorageHelper<boolean>;
  readonly isTutorialConfirmed: LocalStorageHelper<boolean>;
  readonly apiKey: LocalStorageHelper<string>;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }
}
