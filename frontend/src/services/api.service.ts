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

import { makeObservable } from 'mobx';
import { Service } from './service';

/**
 * API service for FastAPI backend (replaces Firebase)
 *
 * This service provides the same interface as FirebaseService but communicates
 * with the FastAPI backend via REST APIs and WebSockets.
 */
export class ApiService extends Service {
  private baseUrl: string;
  private wsUrl: string;
  private websockets: Map<string, WebSocket> = new Map();

  constructor() {
    super();
    makeObservable(this);

    // Configure URLs based on environment
    if (process.env.NODE_ENV === 'development') {
      this.baseUrl = 'http://localhost:8001';
      this.wsUrl = 'ws://localhost:8001';
    } else {
      // Production URLs (update these for your deployment)
      this.baseUrl = window.location.origin;
      this.wsUrl = `ws://${window.location.host}`;
    }

    console.log(`[API] ApiService initialized:`, {
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get image URL (replaces Firebase Storage getDownloadURL)
   * In local mode, images are served via static file server
   */
  async getDownloadUrl(path: string): Promise<string> {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/files/${cleanPath}`;
  }

  /**
   * Create WebSocket connection for document updates
   * (replaces Firestore onSnapshot listener)
   *
   * @param arxivId The arXiv paper ID
   * @param version The paper version
   * @param onUpdate Callback for receiving updates
   * @param onError Optional error callback
   * @returns WebSocket instance
   */
  connectDocumentSocket(
    arxivId: string,
    version: string,
    onUpdate: (data: any) => void,
    onError?: (error: any) => void
  ): WebSocket {
    const wsKey = `${arxivId}_${version}`;
    const wsUrl = `${this.wsUrl}/ws/${arxivId}/${version}`;

    // Close existing connection if any
    if (this.websockets.has(wsKey)) {
      console.log(
        `[WebSocket] Closing existing connection for ${arxivId} v${version}`
      );
      this.websockets.get(wsKey)!.close();
    }

    console.log(
      `[WebSocket] Creating new connection for ${arxivId} v${version}:`,
      {
        url: wsUrl,
        timestamp: new Date().toISOString(),
      }
    );

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] Connected for ${arxivId} v${version}`, {
        url: `${this.wsUrl}/ws/${arxivId}/${version}`,
        timestamp: new Date().toISOString(),
      });
    };

    ws.onmessage = (event) => {
      try {
        // Log raw message data
        console.log(
          `[WebSocket] Message received for ${arxivId} v${version}:`,
          {
            raw: event.data,
            timestamp: new Date().toISOString(),
          }
        );

        const message = JSON.parse(event.data);

        // Log parsed message structure
        console.log(`[WebSocket] Parsed message:`, {
          paper_id: message.paper_id,
          version: message.version,
          type: message.type,
          data_keys: message.data ? Object.keys(message.data) : null,
          loading_status:
            message.data?.loading_status || message.data?.loadingStatus,
          loading_error:
            message.data?.loading_error || message.data?.loadingError,
          full_message: message,
        });

        // The backend sends {paper_id, version, type, data}
        // We pass just the data part to match Firebase onSnapshot interface
        onUpdate(message.data || message);
      } catch (error) {
        console.error(
          `[WebSocket] Failed to parse message for ${arxivId} v${version}:`,
          {
            error,
            raw_data: event.data,
            timestamp: new Date().toISOString(),
          }
        );
      }
    };

    ws.onerror = (error) => {
      console.error(`[WebSocket] Error for ${arxivId} v${version}:`, {
        error,
        readyState: ws.readyState,
        url: ws.url,
        timestamp: new Date().toISOString(),
      });
      if (onError) onError(error);
    };

    ws.onclose = (event) => {
      console.log(`[WebSocket] Closed for ${arxivId} v${version}:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString(),
      });
      this.websockets.delete(wsKey);
    };

    this.websockets.set(wsKey, ws);
    console.log(
      `[WebSocket] WebSocket registered in map: ${wsKey} | Total active connections: ${this.websockets.size}`
    );
    return ws;
  }

  /**
   * Close all WebSocket connections
   */
  closeAllWebSockets() {
    this.websockets.forEach((ws) => ws.close());
    this.websockets.clear();
  }

  /**
   * Helper method to make HTTP requests
   */
  private async fetchApi(
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options?.method || 'GET';
    const startTime = Date.now();

    console.log(`[API] ${method} ${endpoint}`, {
      url,
      headers: options?.headers,
      body: options?.body
        ? typeof options.body === 'string'
          ? JSON.parse(options.body)
          : options.body
        : undefined,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        console.error(`[API] ${method} ${endpoint} failed:`, {
          status: response.status,
          statusText: response.statusText,
          error,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(
          error.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      console.log(`[API] ${method} ${endpoint} success:`, {
        status: response.status,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[API] ${method} ${endpoint} error:`, {
        error,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Request paper import (replaces requestArxivDocImportCallable)
   */
  async requestPaperImport(arxivId: string): Promise<any> {
    console.log(`[API] Requesting paper import for ${arxivId}`);
    const response = await this.fetchApi('/api/papers/import', {
      method: 'POST',
      body: JSON.stringify({ arxiv_id: arxivId }),
    });
    const result = await response.json();
    console.log(`[API] Paper import response for ${arxivId}:`, result);
    return result;
  }

  /**
   * Get paper metadata (replaces getArxivMetadata callable)
   */
  async getMetadata(arxivId: string): Promise<any> {
    console.log(`[API] Fetching metadata for ${arxivId}`);
    const response = await this.fetchApi(`/api/metadata/${arxivId}`);
    const result = await response.json();
    console.log(`[API] Metadata response for ${arxivId}:`, result);
    return result;
  }

  /**
   * Get full document (replaces Firestore read)
   */
  async getDocument(arxivId: string, version: string): Promise<any> {
    console.log(`[API] Fetching document ${arxivId} v${version}`);
    const response = await this.fetchApi(
      `/api/documents/${arxivId}/${version}`
    );
    const result = await response.json();
    console.log(`[API] Document response for ${arxivId} v${version}:`, {
      hasData: !!result,
      loadingStatus: result?.loading_status || result?.loadingStatus,
      dataKeys: result ? Object.keys(result) : null,
    });
    return result;
  }

  /**
   * Get import status (new endpoint)
   */
  async getImportStatus(arxivId: string, version: string): Promise<any> {
    const response = await this.fetchApi(
      `/api/papers/status/${arxivId}/${version}`
    );
    return response.json();
  }

  /**
   * Get AI answer (replaces getLumiResponseCallable)
   */
  async getAnswer(doc: any, request: any, apiKey: string | null): Promise<any> {
    console.log(`[API] Requesting answer:`, {
      query: request?.query || request?.highlight || 'N/A',
      hasApiKey: !!apiKey,
      docId: doc?.metadata?.paperId,
    });
    const response = await this.fetchApi('/api/queries/answer', {
      method: 'POST',
      body: JSON.stringify({ doc, request, api_key: apiKey }),
    });
    const result = await response.json();
    console.log(`[API] Answer response received:`, {
      hasResponse: !!result,
      responseId: result?.id,
    });
    return result;
  }

  /**
   * Get personal summary (replaces getPersonalSummaryCallable)
   */
  async getPersonalSummary(
    doc: any,
    pastPapers: any[],
    apiKey: string | null
  ): Promise<any> {
    console.log(`[API] Requesting personal summary:`, {
      docId: doc?.metadata?.paperId,
      pastPapersCount: pastPapers?.length || 0,
      hasApiKey: !!apiKey,
    });
    const response = await this.fetchApi('/api/queries/personal-summary', {
      method: 'POST',
      body: JSON.stringify({ doc, past_papers: pastPapers, api_key: apiKey }),
    });
    const result = await response.json();
    console.log(`[API] Personal summary response received:`, {
      hasResponse: !!result,
      summaryId: result?.id,
    });
    return result;
  }

  /**
   * Save user feedback (replaces saveUserFeedbackCallable)
   */
  async saveFeedback(feedbackText: string, arxivId?: string): Promise<void> {
    await this.fetchApi('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        user_feedback_text: feedbackText,
        arxiv_id: arxivId,
      }),
    });
  }
}
