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
import { core } from "../core/core";

import { ColorMode } from "../shared/types";
import { LocalStorageService } from "./local_storage.service";

/**
 * Settings service.
 */
export class SettingsService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable colorMode: ColorMode = ColorMode.DEFAULT;
  private readonly localStorageService = core.getService(LocalStorageService);

  @action setColorMode(colorMode: ColorMode) {
    this.colorMode = colorMode;
  }

  setOnboarded(onboarded: boolean) {
    this.localStorageService.setData("isOnboarded", Number(onboarded));
  }

  getOnboarded(): boolean {
    const isOnboarded = this.localStorageService.getData("isOnboarded", 0);
    return Boolean(isOnboarded);
  }
}
