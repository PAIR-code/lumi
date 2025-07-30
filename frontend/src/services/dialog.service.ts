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

/** Base class for all dialog content props. */
export abstract class DialogProps {}

/** Props for the HistoryDialog component. */
export class HistoryDialogProps extends DialogProps {}

/** Props for the UserFeedbackDialog component. */
export class UserFeedbackDialogProps extends DialogProps {}

/**
 * A global service to manage dialogs.
 *
 * This service controls the visibility and properties of dialogs throughout the
 * application, acting as a single source of truth for dialog state.
 */
export class DialogService extends Service {
  isVisible = false;

  /** The properties for the currently displayed dialog. Null if no dialog is visible. */
  dialogProps: DialogProps | null = null;

  constructor() {
    super();
    makeObservable(this, {
      dialogProps: observable,
      show: action,
      hide: action,
    });
  }

  /**
   * Shows a dialog with the specified properties.
   * @param dialogProps The properties for the dialog to display.
   */
  show(dialogProps: DialogProps) {
    this.dialogProps = dialogProps;
  }

  /**
   * Hides the currently visible dialog.
   */
  hide() {
    this.dialogProps = null;
  }
}
