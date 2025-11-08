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

import { Label, LumiSummaries, LumiSummary } from './lumi_doc';
import { makeObservable, observable } from 'mobx';

/**
 * LumiSummaryMaps helper.
 */
export class LumiSummaryMaps {
  constructor(summaries: LumiSummaries) {
    this.setSectionSummaries(summaries.sectionSummaries);
    this.setContentSummaries(summaries.contentSummaries);
    this.setSpanSummaries(summaries.spanSummaries);

    makeObservable(this);
  }

  @observable sectionSummariesMap = new Map<string, LumiSummary>();
  @observable contentSummariesMap = new Map<string, LumiSummary>();
  @observable spanSummariesMap = new Map<string, LumiSummary>();

  setSectionSummaries(summaries: LumiSummary[]) {
    const newSummariesMap = new Map<string, LumiSummary>();
    summaries.forEach((summary) => {
      newSummariesMap.set(summary.id, summary);
    });
    this.sectionSummariesMap = newSummariesMap;
  }

  setContentSummaries(summaries: LumiSummary[]) {
    const newSummariesMap = new Map<string, LumiSummary>();
    summaries.forEach((summary) => {
      newSummariesMap.set(summary.id, summary);
    });
    this.contentSummariesMap = newSummariesMap;
  }

  setSpanSummaries(summaries: LumiSummary[]) {
    const newSummariesMap = new Map<string, LumiSummary>();
    summaries.forEach((summary) => {
      newSummariesMap.set(summary.id, summary);
    });
    this.spanSummariesMap = newSummariesMap;
  }
}
