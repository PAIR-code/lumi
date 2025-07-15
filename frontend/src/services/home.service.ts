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

import { LumiDoc } from "../shared/lumi_doc";
import { action, makeObservable, observable } from "mobx";

import { FirebaseService } from "./firebase.service";
import { Service } from "./service";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

export class HomeService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this, {
      documents: observable.shallow,
      showLumiHistory: observable,
      addDocument: action,
      setShowLumiHistory: action,
    });
  }

  // observable.shallow functions similarly to obsevable.ref except for collections.
  // I.e. this list will be made observable, but its contents will not.
  documents: LumiDoc[] = [];

  // Controls which tab is visible on home page
  showLumiHistory = true;

  addDocument(doc: LumiDoc) {
    // Avoid adding duplicates
    const paperExists = this.documents.find(
      (d) =>
        d.metadata?.paperId === doc.metadata?.paperId &&
        d.metadata?.version === doc.metadata?.version
    );
    if (!paperExists) {
      this.documents.push(doc);
    }
  }

  setShowLumiHistory(showHistory: boolean) {
    this.showLumiHistory = showHistory;
  }
}
