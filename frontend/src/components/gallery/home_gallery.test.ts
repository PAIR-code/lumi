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

import { csrFixture as fixture } from "@lit-labs/testing/fixtures.js";
import { html } from "lit";
import { expect } from "@esm-bundle/chai";
import * as sinon from "sinon";
import { ObservableMap } from "mobx";

import { Core, core } from "../../core/core";
import { HomeService } from "../../services/home.service";
import { HistoryService } from "../../services/history.service";
import { RouterService } from "../../services/router.service";
import { FirebaseService } from "../../services/firebase.service";
import { SnackbarService } from "../../services/snackbar.service";
import { HomeGallery } from "./home_gallery";

import "./home_gallery";

class MockHomeService extends HomeService {
  override showLumiHistory = true;
  override documents = [];
}
class MockRouterService extends RouterService {}
class MockFirebaseService extends FirebaseService {}
class MockHistoryService extends HistoryService {
  override getPaperHistory = sinon.stub().returns([]);
  override paperMetadata = new ObservableMap();
}
class MockSnackbarService extends SnackbarService {
  override show = sinon.stub();
}

class MockCore extends Core {
  private readonly mockServices = new Map<any, any>();

  constructor() {
    super();
    this.mockServices.set(HomeService, new MockHomeService());
    this.mockServices.set(RouterService, new MockRouterService());
    this.mockServices.set(FirebaseService, new MockFirebaseService());
    this.mockServices.set(HistoryService, new MockHistoryService());
    this.mockServices.set(SnackbarService, new MockSnackbarService());
  }

  override getService(name: any) {
    return this.mockServices.get(name);
  }
}

describe("home-gallery", () => {
  let mockCore: MockCore;

  beforeEach(() => {
    mockCore = new MockCore();
    sinon.stub(core, "getService").callsFake((name: any) => {
      return mockCore.getService(name);
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders the initial state", async () => {
    const el = await fixture(html`<home-gallery></home-gallery>`, {
      modules: [],
    });
    const input = el.shadowRoot!.querySelector("pr-textinput");
    const button = el.shadowRoot!.querySelector("pr-button");

    expect(input).to.exist;
    expect(button).to.exist;
    expect(button!.textContent).to.contain("Load document");
  });

  it("renders a list of history items", async () => {
    const historyService = mockCore.getService(
      HistoryService
    ) as MockHistoryService;
    (historyService.getPaperHistory as sinon.SinonStub).returns([
      {
        metadata: {
          paperId: "123",
          title: "Test Paper 1",
          summary: "Summary 1",
          authors: ["Author 1"],
          publishedTimestamp: "2025-07-11",
          version: "1",
        },
        status: "complete",
      },
      {
        metadata: {
          paperId: "456",
          title: "Test Paper 2",
          summary: "Summary 2",
          authors: ["Author 2"],
          publishedTimestamp: "2025-07-12",
          version: "2",
        },
        status: "complete",
      },
    ]);

    const el = await fixture(html`<home-gallery></home-gallery>`, {
      modules: [],
    });
    const galleryCards = el.shadowRoot!.querySelectorAll("gallery-card");

    expect(galleryCards.length).to.equal(2);
  });

  it("simulates user input and clicks", async () => {
    const snackbarService = mockCore.getService(SnackbarService);
    const el = await fixture<HomeGallery>(html`<home-gallery></home-gallery>`, {
      modules: [],
    });

    const requestDocumentStub = sinon
      .stub(el, "requestDocument" as any)
      .resolves({});

    const textInput = el.shadowRoot!.querySelector("pr-textinput")!;
    const internalInput = textInput.shadowRoot!.querySelector("input")!;
    const button = el.shadowRoot!.querySelector("pr-button")!;

    internalInput.value = "12345";
    internalInput.dispatchEvent(
      new Event("input", { bubbles: true, composed: true })
    );
    await el.updateComplete;

    button.click();
    await el.updateComplete;

    expect(
      (snackbarService.show as sinon.SinonStub).calledWith(
        "Starting import - this may take several minutes..."
      )
    ).to.be.true;
    expect(requestDocumentStub.calledOnce).to.be.true;
  });
});
