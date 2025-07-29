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

import { makeObservable } from "mobx";
import { Service } from "./service";
import { Pages, RouterService } from "./router.service";

interface ServiceProvider {
  routerService: RouterService;
}

export enum AnalyticsAction {
  CREATE_DOC = "click_create_doc",
}

/** Manages Google Analytics. */
export class AnalyticsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  trackAction(buttonClick: AnalyticsAction) {
    if (typeof gtag === "function") {
      gtag("event", "user_action", {
        action: buttonClick,
        page_location: this.sp.routerService.activeRoute.path,
      });
    }
  }

  trackPageView(page: Pages, path: string) {
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_title: page,
        page_location: path,
      });
    }
  }
}
