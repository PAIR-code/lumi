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

import { LumiAnswer, LumiAnswerRequest } from './api';

/**
 * Creates a temporary LumiAnswer object to be used as a placeholder
 * while waiting for a real response from the backend.
 * @param request The original request for the answer.
 * @returns A temporary LumiAnswer object.
 */
export function createTemporaryAnswer(request: LumiAnswerRequest): LumiAnswer {
  return {
    id: `temp-${Date.now()}`,
    request,
    responseContent: [],
    timestamp: Date.now(),
    isLoading: true,
  };
}
