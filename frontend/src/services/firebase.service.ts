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

import { FirebaseApp, initializeApp } from "firebase/app";
import {
  Auth,
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  Firestore,
  Unsubscribe,
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";
import {
  Functions,
  connectFunctionsEmulator,
  getFunctions,
} from "firebase/functions";
import {
  connectStorageEmulator,
  FirebaseStorage,
  getStorage,
  ref,
  getDownloadURL,
} from "firebase/storage";
import { makeObservable } from "mobx";

import {
  FIREBASE_LOCAL_HOST_PORT_AUTH,
  FIREBASE_LOCAL_HOST_PORT_FIRESTORE,
  FIREBASE_LOCAL_HOST_PORT_FUNCTIONS,
  FIREBASE_LOCAL_HOST_PORT_STORAGE,
} from "../shared/constants";
import { FIREBASE_CONFIG } from "../../firebase_config";

import { Service } from "./service";

/** Manages Firebase connection, experiments subscription. */
export class FirebaseService extends Service {
  constructor() {
    super();
    makeObservable(this);

    this.app = initializeApp(FIREBASE_CONFIG);
    this.firestore = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.functions = getFunctions(this.app);
    this.storage = getStorage(this.app);

    // Only register emulators if in dev mode
    if (process.env.NODE_ENV === "development") {
      this.registerEmulators();
    }

    // Set up auth provider and scope
    this.provider = new GoogleAuthProvider();
  }

  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
  provider: GoogleAuthProvider;
  storage: FirebaseStorage;
  unsubscribe: Unsubscribe[] = [];

  registerEmulators() {
    connectFirestoreEmulator(
      this.firestore,
      "localhost",
      FIREBASE_LOCAL_HOST_PORT_FIRESTORE
    );
    connectStorageEmulator(
      this.storage,
      "localhost",
      FIREBASE_LOCAL_HOST_PORT_STORAGE
    );
    connectAuthEmulator(
      this.auth,
      `http://localhost:${FIREBASE_LOCAL_HOST_PORT_AUTH}`
    );
    connectFunctionsEmulator(
      this.functions,
      "localhost",
      FIREBASE_LOCAL_HOST_PORT_FUNCTIONS
    );
  }

  // Returns the download URL of the given storage file.
  async getDownloadUrl(path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    return getDownloadURL(storageRef);
  }
}
