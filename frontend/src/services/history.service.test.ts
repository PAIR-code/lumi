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

import { expect } from '@esm-bundle/chai';
import * as sinon from 'sinon';

import { HistoryService } from './history.service';
import { LocalStorageService } from './local_storage.service';
import { LumiAnswer } from '../shared/api';
import { PaperData } from '../shared/types_local_storage';
import { ArxivMetadata } from '../shared/lumi_doc';

const PAPER_KEY_PREFIX = 'lumi-paper:';

describe('HistoryService', () => {
  let historyService: HistoryService;
  let mockLocalStorageService: sinon.SinonStubbedInstance<LocalStorageService>;
  let sandbox: sinon.SinonSandbox;

  // Mocks
  const mockMetadata: ArxivMetadata = {
    paperId: 'doc1',
    title: 'Paper 1',
    authors: [],
    summary: '',
    updatedTimestamp: '',
    publishedTimestamp: '',
    version: '1',
  };

  const mockPaper1: PaperData = {
    metadata: mockMetadata,
    history: [],
    status: 'complete',
    addedTimestamp: Date.now(),
  };
  const mockPaper2: PaperData = {
    metadata: { ...mockMetadata, paperId: 'doc2', title: 'Paper 2' },
    history: [],
    status: 'complete',
    addedTimestamp: Date.now(),
  };
  const mockAnswer: LumiAnswer = {
    id: 'answer1',
    request: { query: 'test query' },
    responseContent: [],
    timestamp: Date.now(),
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockLocalStorageService = sandbox.createStubInstance(LocalStorageService);
    historyService = new HistoryService({
      localStorageService: mockLocalStorageService,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should be created', () => {
    expect(historyService).to.exist;
  });

  describe('Paper Lifecycle', () => {
    it('should initialize and load papers from local storage', () => {
      const key1 = `${PAPER_KEY_PREFIX}doc1`;
      mockLocalStorageService.listKeys
        .withArgs(PAPER_KEY_PREFIX)
        .returns([key1]);
      mockLocalStorageService.getData.withArgs(key1, null).returns(mockPaper1);

      historyService.initialize();

      expect(historyService.paperMetadata.get('doc1')).to.deep.equal(
        mockPaper1.metadata
      );
      expect(historyService.getPaperHistory()).to.deep.include(mockPaper1);
    });

    it("should add a paper with 'loading' status", () => {
      const metadata: ArxivMetadata = {
        ...mockMetadata,
        title: 'Loading Paper',
      };
      historyService.addLoadingPaper('doc1', metadata);

      expect(historyService.paperMetadata.has('doc1')).to.be.true;
      const setDataSpy = mockLocalStorageService.setData;
      expect(setDataSpy.calledOnce).to.be.true;
      const [key, paperData] = setDataSpy.firstCall.args;
      expect(key).to.equal(`${PAPER_KEY_PREFIX}doc1`);
      expect((paperData as PaperData).status).to.equal('loading');
    });

    it("should update a loading paper to 'complete' status", () => {
      const metadata: ArxivMetadata = { ...mockMetadata, title: 'Test Paper' };
      const loadingPaper: PaperData = {
        metadata,
        history: [],
        status: 'loading',
        addedTimestamp: Date.now(),
      };
      historyService.addLoadingPaper('doc1', metadata);
      historyService.addPaper('doc1', metadata);

      const [key, paperData] = mockLocalStorageService.setData.secondCall.args;
      expect(key).to.equal(`${PAPER_KEY_PREFIX}doc1`);
      expect((paperData as PaperData).status).to.equal('complete');
    });

    it("should create a new 'complete' paper if it doesn't exist", () => {
      const metadata: ArxivMetadata = { ...mockMetadata, title: 'New Paper' };
      mockLocalStorageService.getData.returns(null); // No existing paper

      historyService.addPaper('doc1', metadata);

      expect(historyService.paperMetadata.get('doc1')).to.deep.equal(metadata);
      const [key, paperData] = mockLocalStorageService.setData.firstCall.args;
      expect(key).to.equal(`${PAPER_KEY_PREFIX}doc1`);
      expect((paperData as PaperData).status).to.equal('complete');
    });

    it('should retrieve all papers', () => {
      const key1 = `${PAPER_KEY_PREFIX}doc1`;
      const key2 = `${PAPER_KEY_PREFIX}doc2`;
      mockLocalStorageService.listKeys.returns([key1, key2]);
      mockLocalStorageService.getData.withArgs(key1, null).returns(mockPaper1);
      mockLocalStorageService.getData.withArgs(key2, null).returns(mockPaper2);

      const papers = historyService.getPaperHistory();
      expect(papers).to.have.lengthOf(2);
      expect(papers).to.deep.include.members([mockPaper1, mockPaper2]);
    });

    it('should delete a paper from memory and local storage', () => {
      historyService.paperMetadata.set('doc1', mockPaper1.metadata);
      historyService.answers.set('doc1', []);
      historyService.personalSummaries.set('doc1', mockAnswer);

      historyService.deletePaper('doc1');

      expect(historyService.paperMetadata.has('doc1')).to.be.false;
      expect(historyService.answers.has('doc1')).to.be.false;
      expect(historyService.personalSummaries.has('doc1')).to.be.false;
      expect(
        mockLocalStorageService.deleteData.calledWith(`${PAPER_KEY_PREFIX}doc1`)
      ).to.be.true;
    });

    it('should clear all history', () => {
      const key1 = `${PAPER_KEY_PREFIX}doc1`;
      mockLocalStorageService.listKeys.returns([key1]);
      historyService.paperMetadata.set('doc1', mockPaper1.metadata);

      historyService.clearAllHistory();

      expect(historyService.paperMetadata.size).to.equal(0);
      expect(historyService.answers.size).to.equal(0);
      expect(historyService.personalSummaries.size).to.equal(0);
      expect(mockLocalStorageService.deleteData.calledWith(key1)).to.be.true;
    });
  });

  describe('Answer Management', () => {
    it('should initialize and load answers for each paper', () => {
      const paperWithHistory: PaperData = {
        ...mockPaper1,
        history: [mockAnswer],
      };
      const key1 = `${PAPER_KEY_PREFIX}doc1`;
      mockLocalStorageService.listKeys.returns([key1]);
      mockLocalStorageService.getData.returns(paperWithHistory);

      historyService.initialize();

      expect(historyService.getAnswers('doc1')).to.deep.equal([mockAnswer]);
    });

    it('should add an answer to the correct paper', () => {
      mockLocalStorageService.getData.returns(mockPaper1); // Mock getPaperData
      historyService.addAnswer('doc1', mockAnswer);

      expect(historyService.getAnswers('doc1')).to.deep.equal([mockAnswer]);
      expect(mockLocalStorageService.setData.called).to.be.true;
      const updatedPaper = mockLocalStorageService.setData.firstCall.args[1];
      expect((updatedPaper as PaperData).history).to.deep.equal([mockAnswer]);
    });
  });

  describe('3. Personal Summary Management', () => {
    it('should initialize and load personal summaries', () => {
      const paperWithSummary: PaperData = {
        ...mockPaper1,
        personalSummary: mockAnswer,
      };
      const key1 = `${PAPER_KEY_PREFIX}doc1`;
      mockLocalStorageService.listKeys.returns([key1]);
      mockLocalStorageService.getData.returns(paperWithSummary);

      historyService.initialize();

      expect(historyService.personalSummaries.get('doc1')).to.deep.equal(
        mockAnswer
      );
    });

    it('should add a personal summary to the correct paper', () => {
      mockLocalStorageService.getData.returns(mockPaper1);
      historyService.addPersonalSummary('doc1', mockAnswer);

      expect(historyService.personalSummaries.get('doc1')).to.deep.equal(
        mockAnswer
      );
      expect(mockLocalStorageService.setData.called).to.be.true;
      const updatedPaper = mockLocalStorageService.setData.firstCall.args[1];
      expect((updatedPaper as PaperData).personalSummary).to.deep.equal(
        mockAnswer
      );
    });
  });

  describe('4. Temporary Answer Management', () => {
    it('should add a temporary answer', () => {
      historyService.addTemporaryAnswer(mockAnswer);
      expect(historyService.temporaryAnswers).to.deep.include(mockAnswer);
    });

    it('should retrieve all temporary answers', () => {
      historyService.temporaryAnswers = [mockAnswer];
      const tempAnswers = historyService.getTemporaryAnswers();
      expect(tempAnswers).to.deep.equal([mockAnswer]);
    });

    it('should remove a specific temporary answer', () => {
      const answer2: LumiAnswer = { ...mockAnswer, id: 'answer2' };
      historyService.temporaryAnswers = [mockAnswer, answer2];
      historyService.removeTemporaryAnswer('answer1');
      expect(historyService.temporaryAnswers).to.have.lengthOf(1);
      expect(historyService.temporaryAnswers[0].id).to.equal('answer2');
    });

    it('should clear all temporary answers', () => {
      historyService.temporaryAnswers = [mockAnswer];
      historyService.clearTemporaryAnswers();
      expect(historyService.temporaryAnswers).to.be.empty;
    });
  });
});
