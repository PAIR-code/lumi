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
from threading import Timer
from firebase_admin import initialize_app, firestore
from firebase_functions import https_fn, logger, options
from firebase_functions.firestore_fn import (
    on_document_written,
    Event,
    Change,
    DocumentSnapshot,
)
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.api_core import exceptions

from models.gemini import GeminiInvalidResponseException
from shared.firebase_constants import (
    ARXIV_DOCS_COLLECTION,
    ARXIV_METADATA_COLLECTION,
    VERSIONS_COLLECTION,
    LOGS_QUERY_COLLECTION,
    USER_FEEDBACK_COLLECTION,
)


# Local application imports
from answers import answers
from import_pipeline import (
    fetch_utils,
    import_pipeline,
    summaries,
    personal_summary,
    throttling,
)
import main_testing_utils
from models import extract_concepts
from shared.api import LumiAnswerRequest, QueryLog, LumiAnswer, UserFeedback
from shared.constants import (
    ARXIV_ID_MAX_LENGTH,
    MAX_QUERY_LENGTH,
    MAX_HIGHLIGHT_LENGTH,
    MAX_USER_FEEDBACK_LENGTH,
)
from shared.json_utils import convert_keys
from shared.lumi_doc import LumiDoc, LumiSummaries
from shared.types import (
    ArxivMetadata,
    LoadingStatus,
    MetadataCollectionItem,
    FeaturedImage,
)
from shared.types_local_storage import PaperData

if os.environ.get("FUNCTION_RUN_MODE") == "testing":

    def import_delay(*args, **kwargs):
        time.sleep(2)
        return main_testing_utils.create_mock_lumidoc(), "image_path"

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

DOCUMENT_REQUESTED_FUNCTION_TIMEOUT = 540
DOCUMENT_REQUESTED_FUNCTION_TIMEOUT_BUFFER = 10

RELOAD_ERROR_STATES = [
    LoadingStatus.ERROR_DOCUMENT_LOAD_INVALID_RESPONSE,
    LoadingStatus.ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED,
    LoadingStatus.ERROR_SUMMARIZING_INVALID_RESPONSE,
    LoadingStatus.ERROR_SUMMARIZING_QUOTA_EXCEEDED,
]

initialize_app()


@dataclass
class RequestArxivDocImportResult:
    metadata: Optional[ArxivMetadata] = None
    error: Optional[str] = None


@dataclass
class SaveUserFeedbackResult:
    status: str


def _is_locally_emulated() -> bool:
    """Returns True if the function is running in the local emulator."""
    return os.environ.get("FUNCTIONS_EMULATOR") == "true"


def _copy_fields_to_main_doc(arxiv_id, version_doc, db) -> None:
    """
    Mirror the updated timestamp and loading_status fields onto the (parent) lumi doc.

    These fields indicate top level the most recently set loading status and updated timestamp
    by any of the child versions, making it possible to query this collection by these
    fields.
    """
    loading_status = version_doc.get("loadingStatus")
    updated_timestamp = version_doc.get("updatedTimestamp")

    doc_ref = db.collection(ARXIV_DOCS_COLLECTION).document(arxiv_id)
    doc_ref.set(
        {"loadingStatus": loading_status, "updatedTimestamp": updated_timestamp},
        merge=True,
    )


@on_document_written(
    timeout_sec=DOCUMENT_REQUESTED_FUNCTION_TIMEOUT,
    memory=options.MemoryOption.GB_2,
    document=ARXIV_DOCS_COLLECTION + "/{arxivId}/" + VERSIONS_COLLECTION + "/{version}",
)
def on_arxiv_versioned_document_written(event: Event[Change[DocumentSnapshot]]) -> None:
    """
    Depending on loading status, add LumiDoc data and/or write metadata.
    Triggered by any write to a versioned arXiv document.
    """
    db = firestore.client()
    arxiv_id = event.params["arxivId"]
    version = event.params["version"]

    if not event.data.after:
        return

    after_data = event.data.after.to_dict()
    loading_status = after_data.get("loadingStatus")

    _copy_fields_to_main_doc(arxiv_id, after_data, db)

    versioned_doc_ref = (
        db.collection(ARXIV_DOCS_COLLECTION)
        .document(arxiv_id)
        .collection(VERSIONS_COLLECTION)
        .document(version)
    )

    delay = (
        DOCUMENT_REQUESTED_FUNCTION_TIMEOUT - DOCUMENT_REQUESTED_FUNCTION_TIMEOUT_BUFFER
    )
    timer = Timer(delay, _write_timeout_error, args=(versioned_doc_ref, after_data))
    if (
        loading_status == LoadingStatus.WAITING
        or loading_status == LoadingStatus.SUMMARIZING
    ):
        timer.start()

    if loading_status == LoadingStatus.WAITING:
        try:
            # Write metadata to "arxiv_metadata" collection
            arxiv_metadata = from_dict(
                data_class=ArxivMetadata,
                data=convert_keys(after_data["metadata"], "camel_to_snake"),
                config=Config(check_types=False),
            )
            _save_lumi_metadata(
                arxiv_id, MetadataCollectionItem(metadata=arxiv_metadata)
            )

            # Import source as LumiDoc
            _add_lumi_doc(versioned_doc_ref, after_data)
        except exceptions.TooManyRequests as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED,
                error_message=f"Model quota exceeded loading document: {e}",
            )
        except GeminiInvalidResponseException as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_DOCUMENT_LOAD_INVALID_RESPONSE,
                error_message=f"Invalid response loading document: {e}",
            )
        except Exception as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_DOCUMENT_LOAD,
                error_message=f"Error loading document: {e}",
            )
        finally:
            timer.cancel()
    elif loading_status == LoadingStatus.SUMMARIZING:
        # Add summaries to existing LumiDoc data
        try:
            _add_summaries_to_lumi_doc(versioned_doc_ref, after_data)
        except exceptions.TooManyRequests as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_SUMMARIZING_QUOTA_EXCEEDED,
                error_message=f"Model quota exceeded summarizing document: {e}",
            )
        except GeminiInvalidResponseException as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_SUMMARIZING_INVALID_RESPONSE,
                error_message=f"Invalid response summarizing document: {e}",
            )
        except Exception as e:
            _write_error(
                versioned_doc_ref,
                after_data,
                status=LoadingStatus.ERROR_SUMMARIZING,
                error_message=f"Error summarizing document: {e}",
            )
        finally:
            timer.cancel()


def _write_timeout_error(versioned_doc_ref, doc_data):
    _write_error(
        versioned_doc_ref=versioned_doc_ref,
        doc_data=doc_data,
        status=LoadingStatus.TIMEOUT,
        error_message="This paper cannot be loaded (time limit exceeded)",
    )


def _write_error(versioned_doc_ref, doc_data, status, error_message):
    """
    This function will be called if the timeout is reached.
    """
    logger.error("Errored:", error_message)
    doc = convert_keys(doc_data, "camel_to_snake")
    doc["loading_status"] = status
    doc["loading_error"] = error_message
    doc["updated_timestamp"] = SERVER_TIMESTAMP
    lumi_doc_json = convert_keys(doc, "snake_to_camel")
    versioned_doc_ref.update(lumi_doc_json)

    raise https_fn.HttpsError(
        https_fn.FunctionsErrorCode.DEADLINE_EXCEEDED, error_message
    )


def _save_lumi_metadata(arxiv_id: str, metadata_item: MetadataCollectionItem):
    """
    Takes in arxiv_id, version, doc data in dict (TypeScript) form.
    Extracts metadata and saves as new Firestore doc in "arxiv_metadata"
    collection.
    """
    db = firestore.client()
    doc_ref = db.collection(ARXIV_METADATA_COLLECTION).document(arxiv_id)
    metadata_item_dict = convert_keys(asdict(metadata_item), "snake_to_camel")
    doc_ref.set(metadata_item_dict)


def _add_lumi_doc(versioned_doc_ref, doc_data):
    """
    Takes in doc reference, doc data in dict (TypeScript) form.
    Loading status changes from WAITING -> SUMMARIZING.

    - Confirms that `loading_status` is `WAITING`.
    - Imports the PDF and LaTeX source, converting it to a LumiDoc.
    - Updates the Firestore document with the LumiDoc data and sets `loading_status` to `SUMMARIZING`.
    """
    metadata_dict = doc_data.get("metadata", {})
    metadata = ArxivMetadata(**convert_keys(metadata_dict, "camel_to_snake"))
    arxiv_id = metadata.paper_id
    version = metadata.version
    concepts = extract_concepts.extract_concepts(metadata.summary)

    if os.environ.get("FUNCTION_RUN_MODE") == "testing":
        test_config = doc_data.get("testConfig", {})
        if test_config.get("importBehavior") == "fail":
            raise Exception("Simulated import failure via testConfig")

    lumi_doc, first_image_path = import_pipeline.import_arxiv_latex_and_pdf(
        arxiv_id=arxiv_id,
        version=version,
        concepts=concepts,
        metadata=metadata,
    )

    lumi_doc.loading_status = LoadingStatus.SUMMARIZING
    lumi_doc.updated_timestamp = SERVER_TIMESTAMP
    lumi_doc_json = convert_keys(asdict(lumi_doc), "snake_to_camel")
    versioned_doc_ref.update(lumi_doc_json)

    # Update the metadata metadata collection doc with the image path
    _save_lumi_metadata(
        arxiv_id,
        MetadataCollectionItem(
            featured_image=FeaturedImage(image_storage_path=first_image_path),
            metadata=metadata,
        ),
    )


def _add_summaries_to_lumi_doc(versioned_doc_ref, doc_data):
    """
    Takes in doc reference, doc data in dict (TypeScript) form.
    Loading status changes from SUMMARIZING -> SUCCESS/ERROR.

    - Triggered when `loading_status` is `SUMMARIZING`.
    - Generates summaries for the existing LumiDoc data.
    - Updates the document with summaries and sets `loading_status` to `SUCCESS`.
    """
    if os.environ.get("FUNCTION_RUN_MODE") == "testing":
        test_config = doc_data.get("testConfig", {})
        if test_config.get("summaryBehavior") == "fail":
            time.sleep(2)
            raise Exception("Simulated summary failure via testConfig")

    doc = from_dict(
        data_class=LumiDoc,
        data=convert_keys(doc_data, "camel_to_snake"),
        config=Config(check_types=False),
    )
    doc.summaries = summaries.generate_lumi_summaries(doc)
    doc.loading_status = LoadingStatus.SUCCESS
    doc.updated_timestamp = SERVER_TIMESTAMP
    lumi_doc_json = convert_keys(asdict(doc), "snake_to_camel")
    versioned_doc_ref.update(lumi_doc_json)


@https_fn.on_call(memory=options.MemoryOption.MB_512)
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
    return start_arxiv_doc_import(arxiv_id=arxiv_id, test_config=test_config)


def start_arxiv_doc_import(arxiv_id: str, test_config: dict | None = None):
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

    arxiv_metadata_list = fetch_utils.fetch_arxiv_metadata(arxiv_ids=[arxiv_id])
    if len(arxiv_metadata_list) != 1:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL, "Arxiv returned invalid metadata"
        )
    metadata = arxiv_metadata_list[0]

    # Before writing the doc that starts the import, check if we need to throttle.
    throttling.check_throttle()

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
        db.collection(ARXIV_DOCS_COLLECTION)
        .document(metadata.paper_id)
        .collection(VERSIONS_COLLECTION)
        .document(str(metadata.version))
    )

    @firestore.transactional
    def _create_doc_transaction(transaction, doc_ref):
        doc = doc_ref.get()

        if doc.exists:
            lumi_doc = doc.to_dict()
            loading_status = lumi_doc.get("loadingStatus")

            if loading_status == LoadingStatus.TIMEOUT:
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.DEADLINE_EXCEEDED,
                    "This paper cannot be loaded (time limit exceeded)",
                )
            if loading_status not in RELOAD_ERROR_STATES:
                return

        doc_data = {
            "loadingStatus": LoadingStatus.WAITING,
            "updatedTimestamp": SERVER_TIMESTAMP,
            "metadata": convert_keys(asdict(metadata), "snake_to_camel"),
        }
        if test_config and os.environ.get("FUNCTION_RUN_MODE") == "testing":
            doc_data["testConfig"] = test_config

        transaction.set(doc_ref, doc_data)

    _create_doc_transaction(transaction, versioned_doc_ref)


@https_fn.on_call(memory=options.MemoryOption.MB_512)
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

    db = firestore.client()
    doc_ref = db.collection(ARXIV_METADATA_COLLECTION).document(arxiv_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.NOT_FOUND,
            "The request paper metadata was not found.",
        )

    metadata_dict = doc.to_dict()
    metadata_item = from_dict(
        data_class=MetadataCollectionItem,
        data=convert_keys(metadata_dict, "camel_to_snake"),
        config=Config(check_types=False),
    )

    return convert_keys(asdict(metadata_item.metadata), "snake_to_camel")


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

        db.collection(LOGS_QUERY_COLLECTION).add(log_data)
        logger.info(
            f"Logged query for doc {doc.metadata.paper_id}v{doc.metadata.version}"
        )
    except Exception as e:
        logger.error(
            f"Failed to log query for doc {doc.metadata.paper_id}v{doc.metadata.version}: {e}"
        )


@https_fn.on_call(timeout_sec=120, memory=options.MemoryOption.MB_512)
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
    api_key = req.data.get("apiKey")

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

    try:
        lumi_answer = answers.generate_lumi_answer(doc, lumi_request, api_key)
    except exceptions.TooManyRequests as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            f"Gemini quota exceeded: {e}",
        )
    except Exception as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAVAILABLE,
            f"Model call failed: {e}",
        )

    if not _is_locally_emulated():
        _log_query(doc, lumi_answer)

    return convert_keys(asdict(lumi_answer), "snake_to_camel")


@https_fn.on_call(timeout_sec=120, memory=options.MemoryOption.MB_512)
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
    api_key = req.data.get("apiKey")

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

    try:
        summary = personal_summary.get_personal_summary(doc, past_papers, api_key)
    except exceptions.TooManyRequests as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            f"Gemini quota exceeded: {e}",
        )
    except Exception as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAVAILABLE,
            f"Model call failed: {e}",
        )

    return convert_keys(asdict(summary), "snake_to_camel")


@https_fn.on_call(memory=options.MemoryOption.MB_512)
def save_user_feedback(req: https_fn.CallableRequest) -> dict:
    """
    Saves user feedback to Firestore.

    Args:
        req (https_fn.CallableRequest): The request, containing user feedback data.

    Returns:
        A dictionary representation of the SaveUserFeedbackResult object.
    """
    user_feedback_text = req.data.get("user_feedback_text")
    arxiv_id = req.data.get("arxiv_id")

    if not user_feedback_text:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "user_feedback_text must not be empty.",
        )

    if len(user_feedback_text) > MAX_USER_FEEDBACK_LENGTH:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "Feedback text exceeds max length.",
        )

    feedback_data = UserFeedback(
        user_feedback_text=user_feedback_text,
        created_timestamp=SERVER_TIMESTAMP,
        arxiv_id=arxiv_id,
    )

    db = firestore.client()
    db.collection(USER_FEEDBACK_COLLECTION).add(asdict(feedback_data))

    result = SaveUserFeedbackResult(status="success")
    return convert_keys(asdict(result), "snake_to_camel")
