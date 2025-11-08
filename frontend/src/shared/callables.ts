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

import { Functions, httpsCallable } from 'firebase/functions';
import { ArxivMetadata, LumiDoc } from './lumi_doc';
import { LumiAnswer, LumiAnswerRequest, UserFeedback } from './api';
import { PaperData } from './types_local_storage';

/** Firebase cloud function callables */

/** The result from requesting a document import. */
export interface RequestArxivDocImportResult {
  metadata?: ArxivMetadata;
  error?: string;
}

/**
 * Requests the import for a given arxiv doc.
 * @param functions The Firebase Functions instance.
 * @param arxivId The ID of the arXiv document to import.
 */
export const requestArxivDocImportCallable = async (
  functions: Functions,
  arxivId: string
): Promise<RequestArxivDocImportResult> => {
  const result = await httpsCallable<
    { arxiv_id: string },
    RequestArxivDocImportResult
  >(
    functions,
    'request_arxiv_doc_import'
  )({ arxiv_id: arxivId });
  return result.data;
};

/**
 * Requests a Lumi answer based on the document and user input.
 * @param functions The Firebase Functions instance.
 * @param doc The full LumiDoc object.
 * @param request The user's request details.
 * @returns A LumiAnswer object.
 */
export const getLumiResponseCallable = async (
  functions: Functions,
  doc: LumiDoc,
  request: LumiAnswerRequest,
  apiKey: string | null
): Promise<LumiAnswer> => {
  const result = await httpsCallable<
    { doc: LumiDoc; request: LumiAnswerRequest; apiKey: string | null },
    LumiAnswer
  >(
    functions,
    'get_lumi_response'
  )({ doc, request, apiKey });

  return result.data;
};

/**
 * Requests arxiv metadata object from the arxiv paper id.
 * @param functions The Firebase Functions instance.
 * @param arxivId Id of the paper to fetch metadata for.
 * @returns A ArxivMetadata object.
 */
export const getArxivMetadata = async (
  functions: Functions,
  arxivId: string
): Promise<ArxivMetadata> => {
  const result = await httpsCallable<{ arxiv_id: string }, ArxivMetadata>(
    functions,
    'get_arxiv_metadata'
  )({ arxiv_id: arxivId });

  return result.data;
};

/**
 * Requests a personalized summary based on the document and user's history.
 * @param functions The Firebase Functions instance.
 * @param doc The full LumiDoc object.
 * @param pastPapers The user's past papers from local history.
 * @returns A PersonalSummary object.
 */
export const getPersonalSummaryCallable = async (
  functions: Functions,
  doc: LumiDoc,
  pastPapers: PaperData[],
  apiKey: string | null
): Promise<LumiAnswer> => {
  const result = await httpsCallable<
    { doc: LumiDoc; past_papers: PaperData[]; apiKey: string | null },
    LumiAnswer
  >(
    functions,
    'get_personal_summary'
  )({ doc, past_papers: pastPapers, apiKey });

  return result.data;
};

/**
 * Saves user feedback to Firestore.
 * @param functions The Firebase Functions instance.
 * @param feedback The user feedback data.
 */
export const saveUserFeedbackCallable = async (
  functions: Functions,
  feedback: UserFeedback
): Promise<void> => {
  await httpsCallable<
    { user_feedback_text: string; arxiv_id?: string },
    { status: string }
  >(
    functions,
    'save_user_feedback'
  )({
    user_feedback_text: feedback.userFeedbackText,
    arxiv_id: feedback.arxivId,
  });
};
