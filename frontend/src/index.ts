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

import { html, render } from 'lit';
import './app';
import { core } from './core/core';
import { makeServiceProvider } from './service_provider';
import { InitializationService } from './services/initialization.service';

async function main() {
  console.log('[Frontend] Application starting...', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });

  core.initialize(makeServiceProvider);

  // Initialize the global services, if necessary
  const initializationService = core.getService(InitializationService);
  await initializationService.initialize();

  console.log('[Frontend] Application initialized, rendering app component');
  render(html`<lumi-app></lumi-app>`, document.body);
}
main();
