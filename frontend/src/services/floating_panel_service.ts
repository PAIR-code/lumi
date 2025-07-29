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
import { HighlightSelection } from "../shared/selection_utils";
import { LumiReference } from "../shared/lumi_doc";

/** Base class for all floating panel content props. */
export abstract class FloatingPanelContentProps {}

/** Props for the SmartHighlightMenu component. */
export class SmartHighlightMenuProps extends FloatingPanelContentProps {
  constructor(
    public selectedText: string,
    public highlightedSpans: HighlightSelection[],
    public onDefine: (
      text: string,
      highlightedSpans: HighlightSelection[]
    ) => void,
    public onAsk: (
      highlightedText: string,
      query: string,
      highlightedSpans: HighlightSelection[]
    ) => void
  ) {
    super();
  }
}

/** Props for the ReferenceTooltip component. */
export class ReferenceTooltipProps extends FloatingPanelContentProps {
  constructor(public reference: LumiReference) {
    super();
  }
}

/** Additional floating panel content components should define their props here. */

/**
 * A global service to manage a single, app-wide floating UI panel.
 */
export class FloatingPanelService extends Service {
  isVisible = false;
  targetElement: HTMLElement | null = null;
  contentProps: FloatingPanelContentProps | null = null;

  constructor(provider: {}) {
    super();
    makeObservable(this, {
      isVisible: observable,
      targetElement: observable,
      contentProps: observable,
      show: action,
      hide: action,
    });
  }

  show(contentProps: FloatingPanelContentProps, targetElement: HTMLElement) {
    this.contentProps = contentProps;
    this.targetElement = targetElement;
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
    this.targetElement = null;
    this.contentProps = null;
  }
}