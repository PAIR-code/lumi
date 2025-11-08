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

import { createContext } from '@lit/context';
import { Ref } from 'lit/directives/ref.js';
import { SPAN_BLINK_ANIMATION_CLASS } from '../shared/constants';

/**
 * The provided/consumed state for managing scrolling.
 * This context provides methods to register, unregister, and scroll to spans.
 */
export class ScrollState {
  private spanMap = new Map<string, Ref<HTMLElement>>();
  private sectionMap = new Map<string, Ref<HTMLElement>>();
  private imageMap = new Map<string, Ref<HTMLElement>>();

  private answersScrollContainer: Ref<HTMLElement> | null = null;

  registerSpan = (id: string, element: Ref<HTMLElement>) => {
    this.spanMap.set(id, element);
  };

  unregisterSpan = (id: string) => {
    this.spanMap.delete(id);
  };

  scrollToSpan = (id: string) => {
    const element = this.spanMap.get(id)?.value;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add animation class on child span so it does not interfere with
      // other animations on the parent span.
      const childSpan = element.querySelector('span');
      if (childSpan) {
        childSpan.classList.add(SPAN_BLINK_ANIMATION_CLASS);
        childSpan.addEventListener(
          'animationend',
          () => {
            childSpan.classList.remove(SPAN_BLINK_ANIMATION_CLASS);
          },
          {
            once: true,
          }
        );
      }
    } else {
      console.warn(`[ScrollContext] Span with id "${id}" not found.`);
    }
  };

  registerSection = (id: string, element: Ref<HTMLElement>) => {
    this.sectionMap.set(id, element);
  };

  unregisterSection = (id: string) => {
    this.sectionMap.delete(id);
  };

  scrollToSection = (id: string) => {
    const element = this.sectionMap.get(id)?.value;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn(`[ScrollContext] Section with id "${id}" not found.`);
    }
  };

  registerImage = (id: string, element: Ref<HTMLElement>) => {
    this.imageMap.set(id, element);
  };

  unregisterImage = (id: string) => {
    this.imageMap.delete(id);
  };

  scrollToImage = (id: string) => {
    const element = this.imageMap.get(id)?.value;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.warn(`[ScrollContext] Image with id "${id}" not found.`);
    }
  };

  registerAnswersScrollContainer = (element: Ref<HTMLElement>) => {
    this.answersScrollContainer = element;
  };

  unregisterAnswersScrollContainer = () => {
    this.answersScrollContainer = null;
  };

  scrollAnswersToTop = () => {
    if (this.answersScrollContainer?.value) {
      this.answersScrollContainer.value.scrollTop = 0;
    }
  };
}

/**
 * The scroll context object.
 * Components can provide or consume this context to interact with the scrolling
 * functionality.
 */
export const scrollContext = createContext<ScrollState>('scroll-context');
