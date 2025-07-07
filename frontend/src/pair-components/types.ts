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

/**
 * @fileoverview Defines shared types for UI components
 */

/** Component sizes. */
export const COMPONENT_SIZES = ['small', 'medium', 'large'] as const;

/** Size of component. */
export type ComponentSize = (typeof COMPONENT_SIZES)[number];

/** Component variants (background/outline options). */
export const COMPONENT_VARIANTS = ['default', 'filled', 'tonal', 'outlined'];

/** Background/outline of component. */
export type ComponentVariant = (typeof COMPONENT_VARIANTS)[number];

/** Component color palette options. */
export const COMPONENT_COLORS = [
  'primary',
  'secondary',
  'tertiary',
  'neutral',
  'error',
  'success',
] as const;

/** Color of component. */
export type ComponentColor = (typeof COMPONENT_COLORS)[number];
