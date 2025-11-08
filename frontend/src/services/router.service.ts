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

import * as router5 from 'router5';
import browserPlugin from 'router5-plugin-browser';
import { computed, makeObservable, observable } from 'mobx';

import { Service } from './service';
import { AnalyticsService } from './analytics.service';
import { DocumentStateService } from './document_state.service';
import { HistoryService } from './history.service';
import { HomeService } from './home.service';

interface ServiceProvider {
  analyticsService: AnalyticsService;
  documentStateService: DocumentStateService;
  historyService: HistoryService;
  homeService: HomeService;
}

export const ARXIV_DOCS_ROUTE_NAME = 'arxiv';
const DEFAULT_COLLECTION_ID = 'pair_team';

/**
 * Handles app routing and page navigation
 */
export class RouterService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    this.router = router5.createRouter(this.routes, {
      defaultRoute: Pages.HOME,
      // defaultParams,
      queryParams: { booleanFormat: 'empty-true', nullFormat: 'hidden' },
      queryParamsMode: 'loose',
    });
  }

  protected readonly routes: router5.Route[] = [
    {
      name: Pages.HOME,
      path: '/',
    },
    {
      name: Pages.SETTINGS,
      path: '/settings',
    },
    {
      name: Pages.COLLECTION,
      path: '/collections/:collection_id',
    },
    {
      name: Pages.ARXIV_DOCUMENT,
      path: `/${ARXIV_DOCS_ROUTE_NAME}/:document_id`,
    },
  ];

  private readonly router: router5.Router;

  @observable isNavOpen = true;
  @observable.ref activeRoute: Route = { name: '', params: {}, path: '' };
  @observable isHandlingRouteChange = false;
  @observable hasNavigated = false; // True if navigated at least once in app

  private getPage(route: Route): Pages | undefined {
    if (!route) return undefined;
    return route.name as Pages;
  }

  @computed
  get activePage(): Pages | undefined {
    return this.getPage(this.activeRoute);
  }

  override initialize() {
    this.router.usePlugin(browserPlugin({ useHash: true }));
    this.router.subscribe((routeChange: RouteChange) => {
      this.handlerRouteChange(routeChange);
    });
    this.router.start();
  }

  private handlerRouteChange(routeChange: RouteChange) {
    const prevDocId = this.activeRoute.params['document_id'];
    const nextDocId = routeChange.route.params['document_id'];

    const newTitle = nextDocId ? `Lumi - ${nextDocId}` : 'Lumi';
    document.title = newTitle;

    if (prevDocId !== nextDocId) {
      this.sp.historyService.clearTemporaryAnswers();
      this.sp.documentStateService.clearDocument();
    }

    this.activeRoute = routeChange.route;
    if (this.activePage) {
      this.sp.analyticsService.trackPageView(
        this.activePage,
        this.activeRoute.path
      );
    }

    const currentPage = this.getPage(this.activeRoute);
    if (
      currentPage === Pages.HOME &&
      !this.sp.historyService.getPaperHistory().length &&
      !this.hasNavigated
    ) {
      this.navigate(Pages.COLLECTION, {
        collection_id: DEFAULT_COLLECTION_ID,
      });
      return;
    }

    // If gallery page, load collections
    if (currentPage === Pages.HOME || currentPage === Pages.COLLECTION) {
      const currentCollectionId = this.activeRoute.params['collection_id'];
      this.sp.homeService.loadCollections(currentCollectionId);
    }
  }

  setNav(isOpen: boolean) {
    this.isNavOpen = isOpen;
  }

  navigate(page: Pages, params: { [key: string]: string } = {}) {
    this.hasNavigated = true;
    return this.router.navigate(page, { ...params });
  }

  navigateToDefault() {
    this.router.navigateToDefault();
  }

  getActiveRoute() {
    if (this.activeRoute) return this.activeRoute;
    return this.router.getState();
  }

  getActiveRouteParams() {
    return this.activeRoute.params;
  }

  getRoutePath(page: Pages) {
    const routeItem = this.routes.find((item) => item.name === page);
    if (!routeItem) return;
    return routeItem.path;
  }
}

/**
 * Type for onRouteChange callback subscription.
 */
export type Route = router5.State;

/**
 * Type for onRouteChange callback subscription.
 */
export type RouteChange = router5.SubscribeState;

/**
 * Enumeration of different pages.
 */
export enum Pages {
  ARXIV_DOCUMENT = 'ARXIV',
  COLLECTION = 'COLLECTION',
  HOME = 'HOME',
  SETTINGS = 'SETTINGS',
}

/**
 * Metadata for top-level navigation pages.
 */
export interface NavItem {
  page: Pages;
  title: string;
  icon: string;
  isPrimaryPage: boolean;
}

/**
 * Top-level navigation items.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    page: Pages.HOME,
    title: 'Home',
    icon: 'home',
    isPrimaryPage: true,
  },
  {
    page: Pages.SETTINGS,
    title: 'Settings',
    icon: 'settings',
    isPrimaryPage: false,
  },
];

/** Utils function to get Lumi document URL. */
export function getLumiPaperUrl(paperId: string) {
  const loc = window.location;
  return `${loc.protocol}//${loc.host}/#/${ARXIV_DOCS_ROUTE_NAME}/${paperId}`;
}

/** Utils function to get arXiv document URL. */
export function getArxivPaperUrl(paperId: string) {
  return `https://arxiv.org/abs/${paperId}`;
}
