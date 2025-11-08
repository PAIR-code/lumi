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

import { makeObservable } from 'mobx';
import { Service } from './service';
import { Pages, RouterService } from './router.service';

interface ServiceProvider {
  routerService: RouterService;
}

export enum AnalyticsAction {
  CREATE_DOC = 'click_create_doc',

  // home
  HOME_HEADER_FEEDBACK_CLICK = 'home_header_feedback_click',

  // lumi_reader
  READER_TEXT_SELECTION = 'reader_text_selection',
  READER_CONCEPT_CLICK = 'reader_concept_click',
  READER_IMAGE_CLICK = 'reader_image_click',

  // sidebar
  SIDEBAR_TOGGLE_ALL_CONCEPTS = 'sidebar_toggle_all_concepts',
  SIDEBAR_TOGGLE_CONCEPT = 'sidebar_toggle_concept',
  SIDEBAR_TAB_CHANGE = 'sidebar_tab_change',
  SIDEBAR_TOC_SECTION_CLICK = 'sidebar_toc_section_click',
  SIDEBAR_HEADER_FEEDBACK_CLICK = 'sidebar_header_feedback_click',
  SIDEBAR_HEADER_HISTORY_CLICK = 'sidebar_header_history_click',
  SIDEBAR_HEADER_TUTORIAL_CLICK = 'sidebar_header_tutorial_click',

  // lumi_questions
  QUESTIONS_DISMISS_ANSWER = 'questions_dismiss_answer',
  QUESTIONS_SEE_ALL_CLICK = 'questions_see_all_click',
  QUESTIONS_BACK_CLICK = 'questions_back_click',
  QUESTIONS_REFERENCE_CLICK = 'questions_reference_click',
  QUESTIONS_IMAGE_REFERENCE_CLICK = 'questions_image_reference_click',

  // smart_highlight_menu
  MENU_EXPLAIN_CLICK = 'menu_explain_click',
  MENU_ASK_CLICK = 'menu_ask_click',
  MENU_SEND_QUERY = 'menu_send_query',

  // sidebar_header
  HEADER_NAVIGATE_HOME = 'header_navigate_home',
  HEADER_OPEN_SEARCH = 'header_open_search',
  HEADER_CLOSE_SEARCH = 'header_close_search',
  HEADER_EXECUTE_SEARCH = 'header_execute_search',
  HEADER_OPEN_CONTEXT = 'header_open_context',
}

/** Manages Google Analytics. */
export class AnalyticsService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  trackAction(action: AnalyticsAction) {
    if (typeof gtag === 'function') {
      gtag('event', 'user_action', {
        action,
        page_location: this.sp.routerService.activeRoute.path,
      });
    }
  }

  trackPageView(page: Pages, path: string) {
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_title: page,
        page_location: path,
      });
    }
  }
}
