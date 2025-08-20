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

import { action, makeObservable, observable } from "mobx";
import { Service } from "./service";

import { ColorMode } from "../shared/types";

import { LocalStorageService } from "./local_storage.service";

interface ServiceProvider {
  localStorageService: LocalStorageService;
}

const tosConfirmedKey = "tosConfirmed";

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable colorMode: ColorMode = ColorMode.DEFAULT;
  @observable apiKey: string | null = null;

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }

  setTOSConfirmed(onboarded: boolean) {
    this.sp.localStorageService.setData(tosConfirmedKey, onboarded);
  }

  getTOSConfirmed(): boolean {
    const tosConfirmed = this.sp.localStorageService.getData(
      tosConfirmedKey,
      false
    );
    return tosConfirmed;
  }

  setAPIKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  getAPIKey(): string | null {
    return this.apiKey;
  }
}
