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

import { DocumentData, QuerySnapshot } from 'firebase/firestore';

/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // tslint:disable-next-line:no-any
  new (...args: any[]): T;
};

/* Snapshot for Firebase calls. */
export type Snapshot = QuerySnapshot<DocumentData, DocumentData>;

/** Color palette. */
export enum ColorMode {
  DEFAULT = 'default',
  LIGHT = 'light',
  DARK = 'dark',
}

/** Focus State */
export enum FocusState {
  DEFAULT = 'default',
  FOCUSED = 'focused',
  UNFOCUSED = 'unfocused',
}

/** Different views for main gallery page (used in home-gallery component). */
export enum GalleryView {
  LOCAL = 'local', // show paper import, user's collection from local storage
  CURRENT = 'current', // show papers for current collection
}

export enum LumiFont {
  PAPER_TEXT = 'paper-text',
  SPAN_SUMMARY_TEXT = 'span-summary-text',
  DEFAULT = 'default',
}
