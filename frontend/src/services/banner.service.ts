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

import { computed, makeObservable, observable } from 'mobx';
import { Service } from './service';

/** Properties for the top banner. */
export interface BannerProperties {
  message: string | string[];
  icon: string;
  actionText?: string;
  actionCallback?: () => void;
  // Optional. If not provided, the banner will not have a close button.
  closeCallback?: () => void;
}

/** Service to manage the state of the top-of-page banner. */
export class BannerService extends Service {
  @observable private bannerProperties: BannerProperties | null = null;

  @computed get isBannerOpen() {
    return this.bannerProperties !== null;
  }

  constructor() {
    super();
    makeObservable(this);
  }

  setBannerProperties(properties: BannerProperties | null) {
    this.bannerProperties = properties;
  }

  getBannerProperties() {
    return this.bannerProperties;
  }

  clearBannerProperties() {
    this.setBannerProperties(null);
  }
}
