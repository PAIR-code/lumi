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

import { makeObservable, observable, ObservableMap } from 'mobx';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { ArxivCollection } from '../shared/lumi_collection';
import {
  ArxivMetadata,
  FeaturedImage,
  MetadataCollectionItem,
} from '../shared/lumi_doc';

import { FirebaseService } from './firebase.service';
import { HistoryService } from './history.service';
import { Service } from './service';

interface ServiceProvider {
  firebaseService: FirebaseService;
  historyService: HistoryService;
}

export class HomeService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this, {
      collections: observable,
      currentCollection: observable,
      hasLoadedCollections: observable,
      isLoadingCollections: observable,
      showUploadDialog: observable,
    });
  }

  // All collections to show in gallery nav
  collections: ArxivCollection[] = [];
  hasLoadedCollections = false;
  isLoadingCollections = false;

  // Map of paper ID to arXiv metadata
  paperToMetadataMap: ObservableMap<string, ArxivMetadata> =
    new ObservableMap();
  paperToFeaturedImageMap: ObservableMap<string, FeaturedImage> =
    new ObservableMap();

  // Current collection based on page route (undefined if home page)
  currentCollection: ArxivCollection | undefined = undefined;

  // Whether or not to show "upload papers" dialog
  showUploadDialog = false;

  /** Sets visibility for "upload papers" dialog. */
  setShowUploadDialog(showUpload: boolean) {
    this.showUploadDialog = showUpload;
  }

  /** Sets current collection (called from loadCollections). */
  setCurrentCollection(currentCollectionId: string | undefined) {
    // Since we migrated from Firebase, collections are not available yet
    // Always use local storage (browser localStorage via historyService)
    console.log(
      '[HomeService] Loading papers from local storage (localStorage)'
    );

    this.currentCollection = undefined; // No Firebase collections anymore

    // Load metadata for all papers in local storage
    const localPaperIds = this.sp.historyService
      .getPaperHistory()
      .map((item) => item.metadata?.paperId)
      .filter((id) => id !== undefined);

    console.log(
      `[HomeService] Found ${localPaperIds.length} papers in local storage`
    );
    this.loadMetadata(localPaperIds);
  }

  get currentCollectionId() {
    return this.currentCollection?.collectionId;
  }

  get currentMetadata() {
    return this.currentCollection?.paperIds
      .map((id) => this.paperToMetadataMap.get(id))
      .filter((metadata) => metadata !== undefined);
  }

  /**
   * Load collections (currently only local storage, future: from SurrealDB)
   * @param forceReload Whether to fetch documents even if previously fetched
   */
  async loadCollections(
    currentCollectionId: string | undefined,
    forceReload = false
  ) {
    // Collections come from local storage via HistoryService
    // Firebase collections are no longer used (migrated to API backend)
    if (!this.hasLoadedCollections || forceReload) {
      this.isLoadingCollections = true;
      console.log(
        '[HomeService] Using local storage for collections (no remote collections yet)'
      );
      this.collections = [];
      this.hasLoadedCollections = true;
      this.isLoadingCollections = false;
    }

    // Load metadata for papers in local storage
    this.setCurrentCollection(currentCollectionId);
  }

  /**
   * Fetches `arxiv_metadata` document matching each given paper ID
   * and stores in paperMap
   * @param paperIds documents to load
   * @param forceReload Whether to fetch documents even if previously fetched
   */
  async loadMetadata(paperIds: string[], forceReload = false) {
    // Load metadata from local storage (historyService) instead of Firebase
    // Metadata is already available in historyService.paperMetadata
    for (const paperId of paperIds) {
      if (!paperId || (this.paperToMetadataMap.get(paperId) && !forceReload)) {
        continue;
      }

      // Try to get from local history first
      const paperData = this.sp.historyService.getPaperData(paperId);
      if (paperData?.metadata) {
        this.paperToMetadataMap.set(paperId, paperData.metadata);
        console.log(
          `[HomeService] Loaded metadata for ${paperId} from local storage`
        );
        continue;
      }

      // TODO: If not in local storage, fetch from API backend
      // For now, skip Firebase calls
      console.log(
        `[HomeService] Skipping Firebase metadata fetch for ${paperId} (use API backend instead)`
      );

      // Old Firebase code (commented out):
      // try {
      //   const metadataItem = (
      //     await getDoc(
      //       doc(this.sp.firebaseService.firestore, "arxiv_metadata", paperId)
      //     )
      //   ).data() as MetadataCollectionItem;
      //   this.paperToMetadataMap.set(paperId, metadataItem.metadata);
      //   if (metadataItem.featuredImage) {
      //     this.paperToFeaturedImageMap.set(paperId, metadataItem.featuredImage);
      //   }
      // } catch (e) {
      //   console.log(`Error loading ${paperId}: ${e}`);
      // }
    }
  }
}
