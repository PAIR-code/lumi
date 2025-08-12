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
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  where
} from "firebase/firestore";
import { ArxivCollection } from "../shared/lumi_collection";

import { FirebaseService } from "./firebase.service";
import { Service } from "./service";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

export class HomeService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this, {
      collections: observable,
      hasLoadedCollections: observable,
      isLoadingCollections: observable,
    });
  }

  // All collections to show in gallery nav
  collections: ArxivCollection[] = [];
  hasLoadedCollections = false;
  isLoadingCollections = false;

  /**
   * Fetches `arxiv_collections` documents from Firestore
   * (called on home page load)
   * @param forceReload Whether to fetch documents even if previously fetched
   */
  async loadCollections(forceReload = false) {
    if (this.hasLoadedCollections && !forceReload) {
      return;
    }

    this.isLoadingCollections = true;
    try {
      this.collections = (await getDocs(
        query(
          collection(this.sp.firebaseService.firestore, 'arxiv_collections'),
          where('priority', '>=', 0),
          orderBy('priority', 'desc'),
        ),
      )).docs.map((doc) => doc.data() as ArxivCollection);
      this.hasLoadedCollections = true;
    } catch (e) {
      console.log(e);
    }
  }
}
