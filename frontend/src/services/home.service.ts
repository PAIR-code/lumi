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
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ArxivCollection } from "../shared/lumi_collection";
import {
  ArxivMetadata,
  FeaturedImage,
  MetadataCollectionItem,
} from "../shared/lumi_doc";

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
      currentCollection: observable,
      hasLoadedCollections: observable,
      isLoadingCollections: observable,
      paperToMetadataMap: observable,
      showUploadDialog: observable,
    });
  }

  // All collections to show in gallery nav
  collections: ArxivCollection[] = [];
  hasLoadedCollections = false;
  isLoadingCollections = false;

  // Map of paper ID to arXiv metadata
  paperToMetadataMap: Record<string, ArxivMetadata> = {};
  paperToFeaturedImageMap: Record<string, FeaturedImage> = {};

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
    this.currentCollection = this.collections.find(
      (collection) => collection.collectionId === currentCollectionId
    );
    // Load papers for current collection
    this.loadMetadata(this.currentCollection?.paperIds ?? []);
  }

  get currentCollectionId() {
    return this.currentCollection?.collectionId;
  }

  get currentMetadata() {
    return (
      this.currentCollection?.paperIds.map(
        (id) => this.paperToMetadataMap[id]
      ) ?? undefined
    );
  }

  /**
   * Fetches `arxiv_collections` documents from Firestore
   * (called on home page load), then sets current collection
   * @param forceReload Whether to fetch documents even if previously fetched
   */
  async loadCollections(
    currentCollectionId: string | undefined,
    forceReload = false
  ) {
    // First, load collections
    if (!this.hasLoadedCollections || forceReload) {
      this.isLoadingCollections = true;
      try {
        this.collections = (
          await getDocs(
            query(
              collection(
                this.sp.firebaseService.firestore,
                "arxiv_collections"
              ),
              where("priority", ">=", 0),
              orderBy("priority", "desc")
            )
          )
        ).docs.map((doc) => doc.data() as ArxivCollection);
        this.hasLoadedCollections = true;
      } catch (e) {
        console.log(e);
      }
      this.isLoadingCollections = false;
    }
    // Then. set current collection
    this.setCurrentCollection(currentCollectionId);
  }

  /**
   * Fetches `arxiv_metadata` document matching each given paper ID
   * and stores in paperMap
   * @param paperIds documents to load
   * @param forceReload Whether to fetch documents even if previously fetched
   */
  async loadMetadata(paperIds: string[], forceReload = false) {
    for (const paperId of paperIds) {
      if (this.paperToMetadataMap[paperId] && !forceReload) {
        break;
      }
      try {
        const metadataItem = (
          await getDoc(
            doc(this.sp.firebaseService.firestore, "arxiv_metadata", paperId)
          )
        ).data() as MetadataCollectionItem;
        this.paperToMetadataMap[paperId] = metadataItem.metadata;
        if (metadataItem.featuredImage) {
          this.paperToFeaturedImageMap[paperId] = metadataItem.featuredImage;
        }
      } catch (e) {
        console.log(`Error loading ${paperId}: ${e}`);
      }
    }
  }
}
