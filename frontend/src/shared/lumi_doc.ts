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

import { Bytes } from 'firebase/firestore';

// Kept in sync with: functions/shared/lumi_doc.py
export interface Position {
  startIndex: number;
  endIndex: number;
}

// Kept in sync with Color classes in lumi_span_renderer.scss
export const HIGHLIGHT_COLORS = [
  'cyan',
  'green',
  'yellow',
  'orange',
  'pink',
  'purple',
  'blue',
  'gray',
] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export declare interface HighlightMetadata {
  [key: string]: any;
}

export interface Highlight {
  color: HighlightColor;
  spanId: string;
  position?: Position; // Highlights the entire span if the position is undefined.
  metadata?: HighlightMetadata;
}

export interface Citation {
  spanId: string;
  position: Position;
}

export interface CitedContent {
  text: string;
  citations: Citation[];
}

export interface Label {
  id: string;
  label: string;
}

export interface LumiSummary {
  id: string;
  summary: LumiSpan;
}

export interface LumiSummaries {
  sectionSummaries: LumiSummary[];
  contentSummaries: LumiSummary[];
  spanSummaries: LumiSummary[];
  abstractExcerptSpanId?: string;
}

export interface Heading {
  headingLevel: number;
  text: string;
}

export interface ConceptContent {
  label: string;
  value: string;
}

export interface LumiConcept {
  id: string;
  name: string;
  type?: string;
  contents: ConceptContent[];
  inTextCitations: Label[];
}

// TODO(ellenj): Refactor import pipeline to bring in hierarchical headings
export interface LumiSection {
  id: string;
  heading: Heading; // TODO(ellenj): Consider removing headingLevel
  contents: LumiContent[];
  subSections?: LumiSection[];
}

export interface TextContent {
  tagName: string;
  spans: LumiSpan[];
}

export interface ImageContent {
  storagePath: string;
  latexPath: string;
  caption: LumiSpan | null | undefined;
  altText: string;
  width: number;
  height: number;
}

export interface FigureContent {
  images: ImageContent[];
  caption: LumiSpan | null | undefined;
}

// Note: this currently only exists in the front-end type definitions.
// (The backend will directly write the bytes to storage and does not need this type.)
export interface LumiImage {
  storagePath: string;
  bytes: Bytes;
}

export interface HtmlFigureContent {
  html: string;
  caption: LumiSpan | null | undefined;
}

// TODO(ellenj): Refactor import pipeline to bring in hierarchical list items
export interface ListContent {
  listItems: ListItem[];
  isOrdered: boolean;
}

export interface ListItem {
  spans: LumiSpan[];
  subListContent?: ListContent;
}

export interface LumiContent {
  id: string;
  // Allowing this to be null to simplify conversion from backend.
  textContent: TextContent | undefined | null;
  imageContent: ImageContent | undefined | null;
  figureContent: FigureContent | undefined | null;
  htmlFigureContent: HtmlFigureContent | undefined | null;
  listContent: ListContent | undefined | null;
}

// TODO(ellenj): Remove file_id from lumi_doc.py
export interface LumiSpan {
  id: string;
  text: string;
  innerTags: InnerTag[];
}

// TODO(ellenj): Update lumi_doc.py to match.
export enum InnerTagName {
  BOLD = 'b', // Bold - Handled by lumi_span.scss class
  ITALIC = 'i', // Italic - Handled by lumi_span.scss class
  STRONG = 'strong', // Strong - Handled by lumi_span.scss class
  EM = 'em', // em tag - Handled by lumi_span.scss class
  UNDERLINE = 'u', // Underline - Handled by lumi_span.scss class
  MATH = 'math', // Renders as Latex
  MATH_DISPLAY = 'math_display', // Renders as Latex display equation
  REFERENCE = 'ref', // Renders as a linked citation
  SPAN_REFERENCE = 'spanref',
  CONCEPT = 'concept',
  A = 'a',
  CODE = 'code',
  FOOTNOTE = 'footnote',
}

export declare interface InnerTagMetadata {
  [key: string]: string;
}

export interface InnerTag {
  tagName: InnerTagName;
  position: Position;
  metadata: InnerTagMetadata;
  children?: InnerTag[];
}

export interface LumiReference {
  id: string;
  span: LumiSpan;
}

export interface LumiFootnote {
  id: string;
  span: LumiSpan;
}

export interface LumiAbstract {
  contents: LumiContent[];
}

// Kept in sync with: functions/shared/types.py
export interface FeaturedImage {
  imageStoragePath: string;
}

export interface MetadataCollectionItem {
  metadata: ArxivMetadata;
  featuredImage?: FeaturedImage;
}

export interface ArxivMetadata {
  paperId: string;
  version: string;
  authors: string[];
  title: string;
  summary: string;
  updatedTimestamp: string;
  publishedTimestamp: string;
}

export enum LoadingStatus {
  UNSET = 'UNSET',
  // Importing paper into LumiDoc
  WAITING = 'WAITING',
  // Loading summaries after paper has been imported
  SUMMARIZING = 'SUMMARIZING',
  SUCCESS = 'SUCCESS',
  ERROR_DOCUMENT_LOAD = 'ERROR_DOCUMENT_LOAD',
  ERROR_DOCUMENT_LOAD_INVALID_RESPONSE = 'ERROR_DOCUMENT_LOAD_INVALID_RESPONSE',
  ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED = 'ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED',
  ERROR_SUMMARIZING = 'ERROR_SUMMARIZING',
  ERROR_SUMMARIZING_INVALID_RESPONSE = 'ERROR_SUMMARIZING_INVALID_RESPONSE',
  ERROR_SUMMARIZING_QUOTA_EXCEEDED = 'ERROR_SUMMARIZING_QUOTA_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
}

export const LOADING_STATUS_ERROR_STATES = [
  LoadingStatus.ERROR_DOCUMENT_LOAD,
  LoadingStatus.ERROR_DOCUMENT_LOAD_INVALID_RESPONSE,
  LoadingStatus.ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED,
  LoadingStatus.ERROR_SUMMARIZING,
  LoadingStatus.ERROR_SUMMARIZING_QUOTA_EXCEEDED,
  LoadingStatus.ERROR_SUMMARIZING_INVALID_RESPONSE,
];

export interface LumiDoc {
  markdown: string;
  abstract: LumiAbstract;
  sections: LumiSection[];
  concepts: LumiConcept[];
  summaries?: LumiSummaries;
  metadata?: ArxivMetadata;
  loadingStatus: string;
  loadingError?: string;
  references: LumiReference[];
  footnotes?: LumiFootnote[];
}
