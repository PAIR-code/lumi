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
import { LumiContent } from './lumi_doc';
import { HighlightSelection } from './selection_utils';

// Kept in sync with: functions/shared/api.py
export interface ImageInfo {
  imageStoragePath: string;
  caption?: string;
}

// Kept in sync with: functions/shared/api.py
export interface LumiAnswerRequest {
  query?: string;
  highlight?: string;
  highlightedSpans?: HighlightSelection[];
  image?: ImageInfo;
}

// Kept in sync with: functions/shared/api.py
export interface LumiAnswer {
  id: string;
  request: LumiAnswerRequest;
  responseContent: LumiContent[];
  timestamp: number;
  isLoading?: boolean;
}

// Kept in sync with: functions/shared/api.py
export interface UserFeedback {
  userFeedbackText: string;
  arxivId?: string;
}
