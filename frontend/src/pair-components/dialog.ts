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

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing, PropertyValues } from 'lit';

import { customElement, property } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';

import './icon_button';
import { styles } from './dialog.scss';

/** Dialog component. */
@customElement('pr-dialog')
export class Dialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() showDialog = false;
  @property({ type: Boolean }) showCloseButton = false;
  @property({ type: Boolean }) enableEscape = false;
  @property() onOpen: () => void = () => {};
  @property() onClose: () => void = () => {};

  dialogRef: Ref<Element> = createRef();

  protected override updated(_changedProperties: PropertyValues): void {
    if (this.showDialog) {
      this.openDialog();
    } else {
      this.closeDialog();
    }
  }

  openDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).showModal();
      this.onOpen();
    }
  }

  closeDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).close();
      this.onClose();
    }
  }

  override render() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.enableEscape) {
          this.closeDialog();
        } else {
          e.preventDefault();
        }
      }
    };

    return html`
      <dialog ${ref(this.dialogRef)} @keydown=${handleKeyDown}>
        <div class="dialog-header">
          <slot name="title"></slot>
          ${this.showCloseButton ? this.renderCloseButton() : nothing}
        </div>
        <slot></slot>
        <div class="dialog-actions">
          <div class="left"><slot name="actions-left"</slot></div>
          <div class="right"><slot name="actions-right"></slot></div>
        </div>
      </dialog>
    `;
  }

  private renderCloseButton() {
    return html`
      <pr-icon-button
        color="neutral"
        icon="close"
        variant="default"
        @click=${this.closeDialog}
      >
      </pr-icon-button>
    `;
  }
}

declare global {
  interface HtmlElementTagNameMap {
    'pr-dialog': Dialog;
  }
}
