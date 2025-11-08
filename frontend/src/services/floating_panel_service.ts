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
import { Service } from './service';
import { HighlightSelection } from '../shared/selection_utils';
import { LumiConcept, LumiFootnote, LumiReference } from '../shared/lumi_doc';
import { ImageInfo, LumiAnswer } from '../shared/api';

/** Defines the allowed values for menu and anchor corners. */
export type Corner = 'start-start' | 'start-end' | 'end-start' | 'end-end';
const ANCHOR_CORNER_DEFAULT: Corner = 'start-start';
const MENU_CORNER_DEFAULT: Corner = 'end-start';

/** Base class for all floating panel content props. */
export abstract class FloatingPanelContentProps {
  public anchorCorner?: Corner;
  public menuCorner?: Corner;
  public hasFlatContainer?: boolean;
}

/** Props for the SmartHighlightMenu component. */
export class SmartHighlightMenuProps extends FloatingPanelContentProps {
  constructor(
    public selectedText: string,
    public highlightedSpans: HighlightSelection[],
    public onDefine: (
      text: string,
      highlightedSpans: HighlightSelection[],
      imageInfo?: ImageInfo
    ) => void,
    public onAsk: (
      highlightedText: string,
      query: string,
      highlightedSpans: HighlightSelection[],
      imageInfo?: ImageInfo
    ) => void,
    public imageInfo?: ImageInfo
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

/** Props for the ConceptTooltip component. */
export class ConceptTooltipProps extends FloatingPanelContentProps {
  constructor(public concept: LumiConcept) {
    super();
  }
}

/** Props for the FootnoteTooltip component. */
export class FootnoteTooltipProps extends FloatingPanelContentProps {
  constructor(public footnote: LumiFootnote) {
    super();
  }
}

/** Props for the AnswerHighlightTooltip component. */
export class AnswerHighlightTooltipProps extends FloatingPanelContentProps {
  constructor(public answer: LumiAnswer) {
    super();
  }
}

/** Defines a single item in the overflow menu. */
export interface OverflowMenuItem {
  icon?: string;
  label: string;
  onClick: () => void;
}

/** Props for the OverflowMenu component. */
export class OverflowMenuProps extends FloatingPanelContentProps {
  constructor(public items: OverflowMenuItem[]) {
    super();
    this.anchorCorner = 'start-end';
    this.menuCorner = 'end-end';
  }
}

/** Props for the InfoTooltip component. */
export class InfoTooltipProps extends FloatingPanelContentProps {
  constructor(public text: string) {
    super();
    this.anchorCorner = 'end-start';
    this.menuCorner = 'start-start';
    this.hasFlatContainer = true;
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
  anchorCorner: Corner = ANCHOR_CORNER_DEFAULT;
  menuCorner: Corner = MENU_CORNER_DEFAULT;
  hasFlatContainer: boolean | null = null;

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
    if (contentProps.anchorCorner) {
      this.anchorCorner = contentProps.anchorCorner;
    }
    if (contentProps.menuCorner) {
      this.menuCorner = contentProps.menuCorner;
    }
    if (contentProps.hasFlatContainer) {
      this.hasFlatContainer = contentProps.hasFlatContainer;
    }
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
    this.targetElement = null;
    this.contentProps = null;
    this.anchorCorner = ANCHOR_CORNER_DEFAULT;
    this.menuCorner = MENU_CORNER_DEFAULT;
    this.hasFlatContainer = null;
  }
}
