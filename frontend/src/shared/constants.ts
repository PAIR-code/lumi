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

/** App name. */
export const APP_NAME = "Lumi";

/** Firebase constants. */
export const FIREBASE_LOCAL_HOST_PORT_FIRESTORE = 8080;
export const FIREBASE_LOCAL_HOST_PORT_STORAGE = 9199;
export const FIREBASE_LOCAL_HOST_PORT_AUTH = 9099;
export const FIREBASE_LOCAL_HOST_PORT_FUNCTIONS = 5001;

export const VIEWPORT_SMALL_MAX_HEIGHT = 720;

export const MAX_IMPORT_URL_LENGTH = 100;
export const MAX_QUERY_INPUT_LENGTH = 1000;

/** Sidebar tabs. */
export const SIDEBAR_TABS = {
  TOC: "Table of Contents",
  CONCEPTS: "Concepts",
};

export const SIDEBAR_TABS_MOBILE = {
  ANSWERS: "Ask Lumi",
  TOC: "Table of Contents",
  CONCEPTS: "Concepts",
};

export const INITIAL_SIDEBAR_TAB_DESKTOP = SIDEBAR_TABS.TOC;
export const INITIAL_SIDEBAR_TAB_MOBILE = SIDEBAR_TABS_MOBILE.ANSWERS;

export const HIGHLIGHT_METADATA_ANSWER_KEY = "answer";

export const CITATION_CLASSNAME = "citation-marker";
export const FOOTNOTE_CLASSNAME = "footnote-marker";

// Keep in sync with constants.py
export const PERSONAL_SUMMARY_QUERY_NAME = "Summary";
export const CONCEPT_CONTENT_LABEL_DEFINITION = "definition";
export const CONCEPT_CONTENT_LABEL_RELEVANCE = "relevance";
