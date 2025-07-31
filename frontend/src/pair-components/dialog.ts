/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";

import { customElement, property } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";

import { styles } from "./dialog.scss";

/** Dialog component. */
@customElement("pr-dialog")
export class Dialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() showDialog = false;

  dialogRef: Ref<Element> = createRef();

  override updated() {
    if (this.showDialog) {
      this.openDialog();
    } else {
      this.closeDialog();
    }
  }

  openDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).showModal();
    }
  }

  closeDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).close();
    }
  }

  override render() {
    return html`
      <dialog ${ref(this.dialogRef)}>
        <slot></slot>
      </dialog>
    `;
  }
}

declare global {
  interface HtmlElementTagNameMap {
    "pr-dialog": Dialog;
  }
}
