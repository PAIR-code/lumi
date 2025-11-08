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

import { CSSResultGroup, LitElement, html } from 'lit';

import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';
import { styles as sharedStyles } from './shared.scss';

import { styles } from './tooltip.scss';

import type { ComponentColor } from './types';

/** Specifies tooltip position */
export const TOOLTIP_POSITIONS = [
  'TOP_START',
  'TOP',
  'TOP_END',
  'BOTTOM_START',
  'BOTTOM',
  'BOTTOM_END',
  'LEFT_START',
  'LEFT',
  'LEFT_END',
  'RIGHT_START',
  'RIGHT',
  'RIGHT_END',
];

/** Specifies tooltip position */
export type TooltipPosition = (typeof TOOLTIP_POSITIONS)[number];

/** Specifies display mode */
export type DisplayMode =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'flow-root';

const TOOLTIP_POSITIONS_OFFSET_DEFAULT = 4;
const TOOLTIP_DELAY_DEFAULT = 500; // in milliseconds
const TOOLTIP_DELAY_LONG = 1000;

/**
 * Renders a tooltip
 */
@customElement('pr-tooltip')
export class Tooltip extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({ type: String }) text = '';
  @property({ type: Number }) delay = TOOLTIP_DELAY_DEFAULT; // in milliseconds
  @property({ type: Boolean }) longDelay = false;

  @property({ type: Boolean }) shouldRenderAriaLabel = true;
  @property({ type: Boolean }) disabled = false;

  @property({ type: Number }) positionOffset = TOOLTIP_POSITIONS_OFFSET_DEFAULT;
  @property() zIndex: number | undefined = undefined;
  @property() displayMode: DisplayMode | undefined = undefined;

  @property({ type: String }) color: ComponentColor = 'neutral';
  @property({ type: String }) position: TooltipPosition = 'TOP_START';

  private readonly tooltipRef: Ref<HTMLDivElement> = createRef();

  @state() left: number | undefined = undefined;
  @state() right: number | undefined = undefined;
  @state() top: number | undefined = undefined;
  @state() bottom: number | undefined = undefined;

  renderAriaLabel() {
    return this.shouldRenderAriaLabel ? html`aria-label=${this.text}` : '';
  }

  override firstUpdated() {
    this.updatePosition();
  }

  private updatePosition() {
    const tooltip = this.tooltipRef.value;
    if (!tooltip) return;

    const { width, height } = tooltip.getBoundingClientRect();

    if (this.position === 'TOP_START') {
      this.left = 0;
      this.bottom = height + this.positionOffset;
    } else if (this.position === 'TOP_END') {
      this.right = 0;
      this.bottom = height + this.positionOffset;
    } else if (this.position === 'BOTTOM_START') {
      this.left = 0;
      this.top = height + this.positionOffset;
    } else if (this.position === 'BOTTOM_END') {
      this.right = 0;
      this.top = height + this.positionOffset;
    } else if (this.position === 'LEFT_START') {
      this.right = width + this.positionOffset;
      this.top = 0;
    } else if (this.position === 'LEFT_END') {
      this.right = width + this.positionOffset;
      this.bottom = 0;
    } else if (this.position === 'RIGHT_START') {
      this.left = width + this.positionOffset;
      this.top = 0;
    } else if (this.position === 'RIGHT_END') {
      this.left = width + this.positionOffset;
      this.bottom = 0;
    } else if (this.position === 'TOP') {
      this.left = width / 2;
      this.bottom = height + this.positionOffset;
    } else if (this.position === 'BOTTOM') {
      this.top = height + this.positionOffset;
      this.left = width / 2;
    } else if (this.position === 'LEFT') {
      this.right = width + this.positionOffset;
      this.top = height / 2;
    } else if (this.position === 'RIGHT') {
      this.left = width + this.positionOffset;
      this.top = height / 2;
    }
  }

  private getTooltipStyles() {
    const delay = this.longDelay ? TOOLTIP_DELAY_LONG : this.delay;

    const styleObject: { [key: string]: string } = {
      '--transition-delay': `${delay}ms`,
    };

    if (this.zIndex !== undefined) {
      styleObject['--z-index'] = `${this.zIndex}`;
    }

    if (this.displayMode !== undefined) {
      styleObject['--display-mode'] = this.displayMode;
    }

    const formatPixel = (value: number) => {
      return `${value}px`;
    };

    if (this.left !== undefined) {
      styleObject['--left'] = formatPixel(this.left);
    }
    if (this.right !== undefined) {
      styleObject['--right'] = formatPixel(this.right);
    }
    if (this.top !== undefined) {
      styleObject['--top'] = formatPixel(this.top);
    }
    if (this.bottom !== undefined) {
      styleObject['--bottom'] = formatPixel(this.bottom);
    }

    return styleMap(styleObject);
  }

  override render() {
    if (!this.text || this.disabled) return html`<slot></slot>`;

    const tooltipClasses = classMap({
      tooltip: true,
      'centered-horizontal':
        this.position === 'TOP' || this.position === 'BOTTOM',
      'centered-vertical':
        this.position === 'LEFT' || this.position === 'RIGHT',
    });

    return html`
      <div
        class=${tooltipClasses}
        @mouseenter=${() => {
          this.updatePosition();
        }}
        data-title=${this.text}
        style=${this.getTooltipStyles()}
        ${ref(this.tooltipRef)}
      >
        <slot> </slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-tooltip': Tooltip;
  }
}
