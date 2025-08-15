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

import { Service } from "./service";
import {
  Highlight,
  HighlightColor,
  LumiDoc,
} from "../shared/lumi_doc";
import { ScrollState } from "../contexts/scroll_context";
import { HighlightManager } from "../shared/highlight_manager";
import { CollapseManager } from "../shared/collapse_manager";
import { LumiDocManager } from "../shared/lumi_doc_manager";
import { action, makeObservable, observable } from "mobx";
import { HighlightSelection } from "../shared/selection_utils";

/**
 * A service to manage the UI state of a single document, such as section
 * collapse states and span highlights. This allows different components to
 * share and react to this state in a centralized way.
 */
export class DocumentStateService extends Service {
  highlightManager?: HighlightManager;
  collapseManager?: CollapseManager;
  lumiDocManager?: LumiDocManager;

  private scrollState?: ScrollState;

  @observable isHistoryShowAll = false;
  @action setHistoryShowAll(isVisible: boolean) {
    this.isHistoryShowAll = isVisible;
  }

  constructor() {
    super();
    makeObservable(this);
  }

  setDocument(lumiDoc: LumiDoc) {
    this.highlightManager = new HighlightManager();

    this.lumiDocManager = new LumiDocManager(lumiDoc);
    this.collapseManager = new CollapseManager(this.lumiDocManager);
    this.collapseManager.initialize();
  }

  clearDocument() {
    this.highlightManager = undefined;
    this.lumiDocManager = undefined;
    this.collapseManager = undefined;
  }

  setScrollState(scrollState: ScrollState) {
    this.scrollState = scrollState;
  }

  scrollToSpan(spanId: string) {
    this.scrollState?.scrollToSpan(spanId);
  }

  scrollToImage(imageStoragePath: string) {
    this.scrollState?.scrollToImage(imageStoragePath);
  }

  focusOnImage(imageStoragePath: string) {
    if (!this.highlightManager) return;

    this.highlightManager.clearHighlights();
    this.highlightManager.addImageHighlight(imageStoragePath);

    this.scrollToImage(imageStoragePath);
  }

  focusOnSpan(
    highlightedSpans: HighlightSelection[],
    color: HighlightColor = "purple"
  ) {
    if (
      !this.collapseManager ||
      !this.highlightManager ||
      !highlightedSpans.length
    )
      return;

    const spanId = highlightedSpans[0].spanId;
    const isSpanFromLumiDoc = !!this.lumiDocManager?.getSpanById(spanId);

    if (isSpanFromLumiDoc) {
      this.collapseManager.expandToSpan(spanId);
    } else {
      // For now, assumes that the span is in the history if not in the document.
      // TODO(ellenj): Once we can also ask questions from Lumi Concepts, we will need
      // handle that case here.
      if (!this.isHistoryShowAll) {
        this.setHistoryShowAll(true);
      }
    }

    this.highlightManager.clearHighlights();
    const highlights: Highlight[] = highlightedSpans.map(
      (highlightedSpansObject) => {
        return {
          spanId: highlightedSpansObject.spanId,
          position: highlightedSpansObject.position,
          color,
        };
      }
    );
    this.highlightManager.addHighlights(highlights);

    this.scrollToSpan(spanId);
  }
}
