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

import { computed, makeObservable } from "mobx";

import { Service } from "./service";

export type AppMode = "public" | "internal";

/**
 * Service for accessing app configuration based on deployment mode.
 * The mode is set at build time via the APP_MODE environment variable.
 */
export class AppConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  /** Current app deployment mode. */
  @computed get mode(): AppMode {
    return APP_MODE;
  }

  /** Whether the app is running in internal (authenticated) mode. */
  @computed get isInternalMode(): boolean {
    return this.mode === "internal";
  }

  /** Whether the app is running in public (open access) mode. */
  @computed get isPublicMode(): boolean {
    return this.mode === "public";
  }

  /** Feature flags based on deployment mode. */
  @computed get features() {
    return {
      authentication: this.isInternalMode,
    };
  }
}
