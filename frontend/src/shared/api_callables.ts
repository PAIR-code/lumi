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

import { ArxivMetadata, LumiDoc } from './lumi_doc';
import { LumiAnswer, LumiAnswerRequest, UserFeedback } from './api';
import { PaperData } from './types_local_storage';
import { ApiService } from '../services/api.service';

/**
 * FastAPI backend callables (replaces Firebase cloud functions)
 *
 * These functions provide the same interface as the Firebase callables
 * but use the FastAPI backend via REST APIs.
 */

/** The result from requesting a document import. */
export interface RequestArxivDocImportResult {
  metadata?: ArxivMetadata;
  error?: string;
}

/**
 * Requests the import for a given arxiv doc.
 * @param apiService The ApiService instance.
 * @param arxivId The ID of the arXiv document to import.
 */
export const requestArxivDocImportCallable = async (
  apiService: ApiService,
  arxivId: string
): Promise<RequestArxivDocImportResult> => {
  return await apiService.requestPaperImport(arxivId);
};

/**
 * Requests a Lumi answer based on the document and user input.
 * @param apiService The ApiService instance.
 * @param doc The full LumiDoc object.
 * @param request The user's request details.
 * @param apiKey Optional API key for LLM calls.
 * @returns A LumiAnswer object.
 */
export const getLumiResponseCallable = async (
  apiService: ApiService,
  doc: LumiDoc,
  request: LumiAnswerRequest,
  apiKey: string | null
): Promise<LumiAnswer> => {
  return await apiService.getAnswer(doc, request, apiKey);
};

/**
 * Requests arxiv metadata object from the arxiv paper id.
 * @param apiService The ApiService instance.
 * @param arxivId Id of the paper to fetch metadata for.
 * @returns A ArxivMetadata object.
 */
export const getArxivMetadata = async (
  apiService: ApiService,
  arxivId: string
): Promise<ArxivMetadata> => {
  return await apiService.getMetadata(arxivId);
};

/**
 * Requests a personalized summary based on the document and user's history.
 * @param apiService The ApiService instance.
 * @param doc The full LumiDoc object.
 * @param pastPapers The user's past papers from local history.
 * @param apiKey Optional API key for LLM calls.
 * @returns A PersonalSummary object.
 */
export const getPersonalSummaryCallable = async (
  apiService: ApiService,
  doc: LumiDoc,
  pastPapers: PaperData[],
  apiKey: string | null
): Promise<LumiAnswer> => {
  return await apiService.getPersonalSummary(doc, pastPapers, apiKey);
};

/**
 * Saves user feedback.
 * @param apiService The ApiService instance.
 * @param feedback The user feedback data.
 */
export const saveUserFeedbackCallable = async (
  apiService: ApiService,
  feedback: UserFeedback
): Promise<void> => {
  await apiService.saveFeedback(feedback.userFeedbackText, feedback.arxivId);
};

/**
 * Get document from the backend (replaces Firestore read).
 * @param apiService The ApiService instance.
 * @param arxivId The arXiv paper ID.
 * @param version The paper version.
 * @returns The full document.
 */
export const getDocument = async (
  apiService: ApiService,
  arxivId: string,
  version: string
): Promise<LumiDoc> => {
  return await apiService.getDocument(arxivId, version);
};

/**
 * Get import status for a paper.
 * @param apiService The ApiService instance.
 * @param arxivId The arXiv paper ID.
 * @param version The paper version.
 * @returns The import status.
 */
export const getImportStatus = async (
  apiService: ApiService,
  arxivId: string,
  version: string
): Promise<any> => {
  return await apiService.getImportStatus(arxivId, version);
};
