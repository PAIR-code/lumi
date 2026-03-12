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

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from "mobx";

import { Service } from "./service";
import { FirebaseService } from "./firebase.service";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

/**
 * Service for managing Firebase Authentication.
 * Only active in internal mode (when APP_MODE === "internal").
 */
export class AuthService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    // Only initialize auth in internal mode
    if (APP_MODE === "internal") {
      this.initializeAuth();
    } else {
      // In public mode, auth is not used
      this.isLoading = false;
    }
  }

  /** The currently authenticated user, or null if not signed in. */
  @observable user: User | null = null;

  /** Whether auth state is still being determined. */
  @observable isLoading = true;

  /** Error message from the last auth operation, if any. */
  @observable error: string | null = null;

  /** Whether the user is currently authenticated. */
  @computed get isAuthenticated(): boolean {
    return this.user !== null;
  }

  /** The current user's UID, or null if not authenticated. */
  @computed get userId(): string | null {
    return this.user?.uid ?? null;
  }

  /** The current user's display name. */
  @computed get displayName(): string | null {
    return this.user?.displayName ?? null;
  }

  /** The current user's email. */
  @computed get email(): string | null {
    return this.user?.email ?? null;
  }

  /** The current user's photo URL. */
  @computed get photoURL(): string | null {
    return this.user?.photoURL ?? null;
  }

  private initializeAuth() {
    const auth = this.sp.firebaseService.auth;
    if (!auth) {
      console.warn("AuthService: Firebase Auth not initialized");
      this.isLoading = false;
      return;
    }

    onAuthStateChanged(auth, (user) => {
      runInAction(() => {
        this.user = user;
        this.isLoading = false;
        this.error = null;
      });
    });
  }

  /** Sign in with Google using a popup. */
  @action
  async signInWithGoogle(): Promise<void> {
    const auth = this.sp.firebaseService.auth;
    if (!auth) {
      this.error = "Authentication not available";
      return;
    }

    try {
      this.error = null;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : "Sign in failed";
      });
      console.error("Sign in error:", e);
    }
  }

  /** Sign out the current user. */
  @action
  async signOut(): Promise<void> {
    const auth = this.sp.firebaseService.auth;
    if (!auth) return;

    try {
      this.error = null;
      await signOut(auth);
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : "Sign out failed";
      });
      console.error("Sign out error:", e);
    }
  }
}
