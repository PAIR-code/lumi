# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

# Cloud functions for Lumi backend - document preprocessing + import pipeline.
#
# This file containing Python cloud functions must be named main.py.
# See https://cloud.google.com/run/docs/write-functions#python for more info.

# Standard library imports
import os
import time
from typing import Optional
from dataclasses import asdict, dataclass
from unittest.mock import MagicMock

# Third-party library imports
from dacite import from_dict, Config
from firebase_admin import initialize_app, firestore
from firebase_functions import https_fn, logger
from firebase_functions.firestore_fn import (
    on_document_written,
    Event,
    Change,
    DocumentSnapshot,
)
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

# Local application imports
from answers import answers
from import_pipeline import fetch_utils, import_pipeline, summaries, personal_summary
import main_testing_utils
from models import extract_concepts
from shared.api import LumiAnswerRequest, QueryLog, LumiAnswer
from shared.constants import ARXIV_ID_MAX_LENGTH, MAX_QUERY_LENGTH, MAX_HIGHLIGHT_LENGTH
from shared.json_utils import convert_keys
from shared.lumi_doc import LumiDoc, LumiSummaries
from shared.types import ArxivMetadata, LoadingStatus
from shared.types_local_storage import PaperData

if os.environ.get("FUNCTION_RUN_MODE") == "testing":

    def import_delay(*args, **kwargs):
        time.sleep(2)
        return main_testing_utils.create_mock_lumidoc()

    def summary_delay(*args, **kwargs):
        time.sleep(2)
        return LumiSummaries(
            section_summaries=[], content_summaries=[], span_summaries=[]
        )

    import_pipeline = MagicMock()
    import_pipeline.import_arxiv_latex_and_pdf.side_effect = import_delay
    import_pipeline.import_arxiv_latex_and_pdf.return_value = (
        main_testing_utils.create_mock_lumidoc()
    )

    summaries = MagicMock()
    summaries.generate_lumi_summaries.side_effect = summary_delay
    summaries.generate_lumi_summaries.return_value = LumiSummaries(
        section_summaries=[], content_summaries=[], span_summaries=[]
    )
    extract_concepts = MagicMock()
    extract_concepts.extract_concepts.return_value = []

_ARXIV_DOCS_COLLECTION = "arxiv_docs"
_VERSIONS_COLLECTION = "versions"
_LOGS_QUERY_COLLECTION = "query_logs"

initialize_app()


@dataclass
class RequestArxivDocImportResult:
    metadata: Optional[ArxivMetadata] = None
    error: Optional[str] = None


def _is_locally_emulated() -> bool:
    """Returns True if the function is running in the local emulator."""
    return os.environ.get("FUNCTIONS_EMULATOR") == "true"


@on_document_written(
    timeout_sec=540,
    memory=512,
    document=_ARXIV_DOCS_COLLECTION
    + "/{arxivId}/"
    + _VERSIONS_COLLECTION
    + "/{version}",
)
def on_document_import_requested(event: Event[Change[DocumentSnapshot]]) -> None:
    """
    Handles the import and summarization of a document in a two-step process.
    This function is triggered by any write to a versioned document.

    Step 1 (WAITING -> SUMMARIZING):
    - Triggered when `loading_status` is `WAITING`.
    - Imports the PDF and LaTeX source, converting it to a LumiDoc.
    - Updates the Firestore document with the LumiDoc data and sets `loading_status` to `SUMMARIZING`.

    Step 2 (SUMMARIZING -> SUCCESS/ERROR):
    - Triggered when `loading_status` is `SUMMARIZING`.
    - Generates summaries for the existing LumiDoc data.
    - Updates the document with summaries and sets `loading_status` to `SUCCESS`.
    """
    db = firestore.client()
    arxiv_id = event.params["arxivId"]
    version = event.params["version"]

    if not event.data.after:
        return

    after_data = event.data.after.to_dict()
    loading_status = after_data.get("loadingStatus")
    test_config = after_data.get("testConfig", {})

    versioned_doc_ref = (
        db.collection(_ARXIV_DOCS_COLLECTION)
        .document(arxiv_id)
        .collection(_VERSIONS_COLLECTION)
        .document(version)
    )

    if loading_status == LoadingStatus.WAITING:
        metadata_dict = after_data.get("metadata", {})
        metadata = ArxivMetadata(**convert_keys(metadata_dict, "camel_to_snake"))
        concepts = extract_concepts.extract_concepts(metadata.summary)

        try:
            if os.environ.get("FUNCTION_RUN_MODE") == "testing":
                if test_config.get("importBehavior") == "fail":
                    raise Exception("Simulated import failure via testConfig")

            lumi_doc = import_pipeline.import_arxiv_latex_and_pdf(
                arxiv_id=arxiv_id,
                version=version,
                concepts=concepts,
                metadata=metadata,
            )
            lumi_doc.loading_status = LoadingStatus.SUMMARIZING
            lumi_doc_json = convert_keys(asdict(lumi_doc), "snake_to_camel")
            versioned_doc_ref.update(lumi_doc_json)
        except Exception as e:
            logger.error(f"Error importing doc {arxiv_id}v{version}: {e}")
            versioned_doc_ref.update(
                {
                    "loadingStatus": LoadingStatus.ERROR,
                    "loadingError": f"Error importing document: {e}",
                }
            )

    elif loading_status == LoadingStatus.SUMMARIZING:
        try:
            if os.environ.get("FUNCTION_RUN_MODE") == "testing":
                if test_config.get("summaryBehavior") == "fail":
                    time.sleep(2)
                    raise Exception("Simulated summary failure via testConfig")

            doc = from_dict(
                data_class=LumiDoc,
                data=convert_keys(after_data, "camel_to_snake"),
                config=Config(check_types=False),
            )
            doc.summaries = summaries.generate_lumi_summaries(doc)
            doc.loading_status = LoadingStatus.SUCCESS
            lumi_doc_json = convert_keys(asdict(doc), "snake_to_camel")
            versioned_doc_ref.update(lumi_doc_json)
        except Exception as e:
            logger.error(f"Error summarizing doc {arxiv_id}v{version}: {e}")
            versioned_doc_ref.update(
                {
                    "loadingStatus": LoadingStatus.ERROR,
                    "loadingError": f"Error summarizing document: {e}",
                }
            )


@https_fn.on_call()
def request_arxiv_doc_import(req: https_fn.CallableRequest) -> dict:
    """
    Requests the import for a given arxiv doc, after requesting its metadata.

    Args:
        req (https_fn.CallableRequest): The request, containing the arxiv_id.

    Returns:
        A dictionary representation of the RequestArxivDocImportResult object.
    """
    arxiv_id = req.data.get("arxiv_id")
    test_config = req.data.get("test_config")

    if not arxiv_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Must specify arxiv_id parameter.",
        )

    if len(arxiv_id) > ARXIV_ID_MAX_LENGTH:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Incorrect arxiv_id length.",
        )

    try:
        fetch_utils.check_arxiv_license(arxiv_id)
    except ValueError as e:
        logger.error(f"License check failed for {arxiv_id}: {e}")
        result = RequestArxivDocImportResult(error=str(e))
        return asdict(result)
    except Exception as e:
        logger.error(
            f"An unexpected error occurred during license check for {arxiv_id}: {e}"
        )
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.INTERNAL, str(e))

    # We need to request the latest paper version from the arXiv API.
    arxiv_metadata_list = fetch_utils.fetch_arxiv_metadata(arxiv_ids=[arxiv_id])
    if len(arxiv_metadata_list) != 1:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL, "Arxiv returned invalid metadata"
        )
    metadata = arxiv_metadata_list[0]

    _try_doc_write(metadata, test_config)

    result = RequestArxivDocImportResult(
        metadata=convert_keys(asdict(metadata), "snake_to_camel")
    )
    return asdict(result)


def _try_doc_write(metadata: ArxivMetadata, test_config: dict | None = None):
    """
    Attempts to write a document at the given id and version.

    If the doc already exists, exits.

    Args:
        arxiv_id (str): The paper id (location to write the collection document).
        version (int): The paper version (location write the subcollection document).

    Returns:
        None
    """
    db = firestore.client()
    transaction = db.transaction()
    versioned_doc_ref = (
        db.collection(_ARXIV_DOCS_COLLECTION)
        .document(metadata.paper_id)
        .collection(_VERSIONS_COLLECTION)
        .document(str(metadata.version))
    )

    @firestore.transactional
    def _create_doc_transaction(transaction, doc_ref):
        doc = doc_ref.get()

        if doc.exists:
            lumi_doc = doc.to_dict()
            loading_status = lumi_doc.get("loadingStatus")

            if loading_status != LoadingStatus.ERROR:
                return

        doc_data = {
            "loadingStatus": LoadingStatus.WAITING,
            "metadata": convert_keys(asdict(metadata), "snake_to_camel"),
        }
        if test_config and os.environ.get("FUNCTION_RUN_MODE") == "testing":
            doc_data["testConfig"] = test_config

        transaction.set(doc_ref, doc_data)

    _create_doc_transaction(transaction, versioned_doc_ref)


@https_fn.on_call()
def get_arxiv_metadata(req: https_fn.CallableRequest) -> dict:
    arxiv_id = req.data.get("arxiv_id")

    if not arxiv_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Must specify arxiv_id parameter.",
        )

    if len(arxiv_id) > ARXIV_ID_MAX_LENGTH:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Incorrect arxiv_id length.",
        )

    metadata_list = fetch_utils.fetch_arxiv_metadata(arxiv_ids=[arxiv_id])
    if not metadata_list:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.NOT_FOUND,
            "The request paper metadata was not found.",
        )
    metadata = metadata_list[0]

    return convert_keys(asdict(metadata), "snake_to_camel")


def _log_query(doc: LumiDoc, lumi_answer: LumiAnswer):
    """
    Logs a query to the `logs_query` collection in Firestore.

    Args:
        doc (LumiDoc): The document related to the query.
        lumi_request (LumiAnswerRequest): The user's request.
    """
    try:
        db = firestore.client()
        query_log = QueryLog(
            created_timestamp=SERVER_TIMESTAMP,
            answer=lumi_answer,
            arxiv_id=doc.metadata.paper_id,
            version=doc.metadata.version,
        )
        log_data = asdict(query_log)

        db.collection(_LOGS_QUERY_COLLECTION).add(log_data)
        logger.info(
            f"Logged query for doc {doc.metadata.paper_id}v{doc.metadata.version}"
        )
    except Exception as e:
        logger.error(
            f"Failed to log query for doc {doc.metadata.paper_id}v{doc.metadata.version}: {e}"
        )


@https_fn.on_call(timeout_sec=120)
def get_lumi_response(req: https_fn.CallableRequest) -> dict:
    """
    Generates a Lumi answer based on the document and user input.

    Args:
        req (https_fn.CallableRequest): The request, containing the doc and request objects.

    Returns:
        A dictionary representation of the LumiAnswer object.
    """
    doc_dict = req.data.get("doc")
    request_dict = req.data.get("request")

    if not doc_dict or not request_dict:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Must specify 'doc' and 'request' parameters.",
        )

    doc = from_dict(
        data_class=LumiDoc,
        data=convert_keys(doc_dict, "camel_to_snake"),
        config=Config(check_types=False),
    )
    lumi_request = from_dict(
        data_class=LumiAnswerRequest,
        data=convert_keys(request_dict, "camel_to_snake"),
        config=Config(check_types=False),
    )

    if lumi_request.query and len(lumi_request.query) > MAX_QUERY_LENGTH:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Query exceeds max length.",
        )
    if lumi_request.highlight and len(lumi_request.highlight) > MAX_HIGHLIGHT_LENGTH:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Highlight exceeds max length.",
        )

    lumi_answer = answers.generate_lumi_answer(doc, lumi_request)

    if not _is_locally_emulated():
        _log_query(doc, lumi_answer)

    return convert_keys(asdict(lumi_answer), "snake_to_camel")


@https_fn.on_call(timeout_sec=120)
def get_personal_summary(req: https_fn.CallableRequest) -> dict:
    """
    Generates a personalized summary based on the document and user's history.

    Args:
        req (https_fn.CallableRequest): The request, containing the doc and past_papers.

    Returns:
        A dictionary representation of the PersonalSummary object.
    """
    doc_dict = req.data.get("doc")
    past_papers_dict = req.data.get("past_papers")

    if not doc_dict or past_papers_dict is None:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Must specify 'doc' and 'past_papers' parameters.",
        )

    doc = from_dict(
        data_class=LumiDoc,
        data=convert_keys(doc_dict, "camel_to_snake"),
        config=Config(check_types=False),
    )
    past_papers = [
        from_dict(
            data_class=PaperData,
            data=convert_keys(p, "camel_to_snake"),
            config=Config(check_types=False),
        )
        for p in past_papers_dict
    ]

    summary = personal_summary.get_personal_summary(doc, past_papers)
    return convert_keys(asdict(summary), "snake_to_camel")
