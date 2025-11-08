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
import { Highlight } from './lumi_doc';

/**
 * Manages the highlight state of spans in a document.
 */
export class HighlightManagerBase {
  highlightedSpans = new Map<string, Highlight[]>();
  highlightedImages = new Set<string>();

  constructor() {
    makeObservable(this, this.getObservables());
  }

  getObservables() {
    return {
      highlightedSpans: observable.shallow,
      highlightedImages: observable.shallow,
      addHighlights: action,
      removeHighlights: action,
      clearHighlights: action,
      addImageHighlight: action,
      removeImageHighlight: action,
    };
  }

  addHighlights(highlights: Highlight[]) {
    for (const highlight of highlights) {
      const existing = this.highlightedSpans.get(highlight.spanId) || [];
      this.highlightedSpans.set(highlight.spanId, [...existing, highlight]);
    }
  }

  getSpanHighlights(spanId: string): Highlight[] {
    return this.highlightedSpans.get(spanId) ?? [];
  }

  removeHighlights(spanIds: string[]) {
    for (const spanId of spanIds) {
      this.highlightedSpans.delete(spanId);
    }
  }

  addImageHighlight(imageStoragePath: string) {
    this.highlightedImages.add(imageStoragePath);
  }

  removeImageHighlight(imageStoragePath: string) {
    this.highlightedImages.delete(imageStoragePath);
  }

  isImageHighlighted(imageStoragePath: string): boolean {
    return this.highlightedImages.has(imageStoragePath);
  }

  clearHighlights() {
    this.highlightedSpans.clear();
    this.highlightedImages.clear();
  }
}

export class HighlightManager extends HighlightManagerBase {}
