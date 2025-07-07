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

import { html, TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { LumiReference } from "../../../shared/lumi_doc";
import { renderLumiSpan } from "../../lumi_span/lumi_span_renderer";

import "../../lumi_span/lumi_span";

export interface ReferencesRendererProperties {
  references: LumiReference[];
}

function renderReference(reference: LumiReference) {
  const lumiSpanClasses = classMap({
    reference: true,
  });

  return html`<lumi-span
    id=${reference.id}
    class=${lumiSpanClasses}
    .span=${reference.span}
    >${renderLumiSpan({ span: reference.span })}</lumi-span
  >`;
}

export function renderReferences(
  props: ReferencesRendererProperties
): TemplateResult {
  const { references } = props;

  return html`
    <div class="references-renderer-container">
      <div class="references">
        <h2>References</h2>
        ${references.map((reference) => renderReference(reference))}
      </div>
    </div>
  `;
}
