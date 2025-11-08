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

import { Service } from './service';

import type { Ref } from 'lit/directives/ref.js';

/**
 * Service for showing snackbar notifications.
 */
export class SnackbarService extends Service {
  private toastRef: Ref<any> | undefined;

  setToast(toastRef: Ref<any>) {
    this.toastRef = toastRef;
  }

  show(message: string, time: number = 2500) {
    if (!this.toastRef?.value) {
      console.error('Toast ref not set.');
      return;
    }
    this.toastRef.value.show(message, time);
  }
}
