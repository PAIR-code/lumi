"""
Import service orchestrates paper import pipeline

Integrates with existing functions/import_pipeline/ for paper processing.
"""

import asyncio
import json
import logging
from datetime import datetime

from config import settings

# Import backend modules
from database import get_db

# Import from local copies (copied from functions/)
from import_pipeline import import_pipeline, summaries
from llm_models import extract_concepts
from models.document import LoadingStatus
from shared.types import ArxivMetadata
from utils.surreal_utils import (
    format_record_id,
    get_document_version,
    update_document_status,
)
from websocket import get_connection_manager

logger = logging.getLogger(__name__)


class ImportService:
    """Handles paper import and processing"""

    def __init__(self):
        self.timeout_seconds = settings.IMPORT_TIMEOUT_SECONDS
        self.timeout_buffer = settings.IMPORT_TIMEOUT_BUFFER

    async def process_document_import(
        self, arxiv_id: str, version: str, metadata: ArxivMetadata
    ):
        """
        Process paper import with status updates via WebSocket

        Flow:
        1. WAITING → extract concepts → import PDF/LaTeX → SUMMARIZING
        2. SUMMARIZING → generate summaries → SUCCESS
        3. Send WebSocket updates at each stage
        4. Handle errors and timeouts
        """
        paper_key = f"{arxiv_id}_v{version}"
        manager = get_connection_manager()

        try:
            logger.info(f"🚀 BACKGROUND TASK STARTED: {arxiv_id} v{version}")
            print(
                f"🚀 BACKGROUND TASK STARTED: {arxiv_id} v{version}"
            )  # Console output for visibility

            # Convert metadata to dict for JSON serialization
            from dataclasses import asdict

            from shared.json_utils import convert_keys

            metadata_dict = convert_keys(asdict(metadata), "snake_to_camel")

            # Stage 1: Extract concepts from abstract
            await manager.send_update(
                paper_key,
                version,
                {
                    "loadingStatus": LoadingStatus.WAITING.value,
                    "progress": "Extracting key concepts...",
                    "metadata": metadata_dict,
                },
            )

            # Run concept extraction in thread pool (blocking LLM call)
            loop = asyncio.get_event_loop()
            concepts = await loop.run_in_executor(
                None, extract_concepts.extract_concepts, metadata.summary
            )

            logger.info(f"Extracted {len(concepts)} concepts for {arxiv_id}")

            # Stage 2: Import document (PDF + LaTeX processing)
            print(f"📚 Stage 2/3: Processing LaTeX and PDF for {arxiv_id}...")
            await manager.send_update(
                paper_key,
                version,
                {
                    "loadingStatus": LoadingStatus.WAITING.value,
                    "progress": "Processing LaTeX and PDF...",
                    "metadata": metadata_dict,
                },
            )

            # Run import in thread pool (blocking operation) with timeout
            import time

            start_time = time.time()

            # Wrap in timeout to prevent infinite hangs (e.g., LaTeX inlining issues)
            import_task = loop.run_in_executor(
                None,
                import_pipeline.import_arxiv_latex_and_pdf,
                arxiv_id,
                version,
                concepts,
                metadata,
                False,  # debug
                "",  # existing_model_output_file
                True,  # run_locally (use local storage)
            )

            try:
                lumi_doc, first_image_path = await asyncio.wait_for(
                    import_task, timeout=self.timeout_seconds
                )
            except TimeoutError:
                print(f"⏱️  Stage 2/3 TIMEOUT after {self.timeout_seconds}s")
                raise

            elapsed = time.time() - start_time

            logger.info(
                f"Document processed for {arxiv_id}, {len(lumi_doc.sections)} sections in {elapsed:.1f}s"
            )
            print(
                f"✅ Stage 2/3 complete: Processed {len(lumi_doc.sections)} sections in {elapsed:.1f}s"
            )

            # Update database with full document
            db = get_db()
            if not db:
                logger.error(
                    f"❌ Database connection is None! Cannot save document {arxiv_id}"
                )
                raise Exception("Database not connected")

            version_id = format_record_id("document_versions", f"{arxiv_id}_v{version}")
            print(f"🔍 Updating document at {version_id}")

            # Convert LumiDoc to dict with camelCase keys
            lumi_doc_dict = convert_keys(asdict(lumi_doc), "snake_to_camel")

            # Debug: Check what we're about to save
            print(f"📝 Saving {len(lumi_doc_dict.get('sections', []))} sections")
            print(f"📝 Markdown length: {len(lumi_doc_dict.get('markdown', ''))}")

            try:
                result = await db.query(
                    f"""
                    UPDATE {version_id} MERGE {{
                        loading_status: 'SUMMARIZING',
                        markdown: $markdown,
                        sections: $sections,
                        concepts: $concepts,
                        abstract: $abstract,
                        references: $references,
                        footnotes: $footnotes,
                        updated_timestamp: time::now()
                    }}
                """,
                    {
                        "markdown": lumi_doc_dict.get("markdown", ""),
                        "sections": json.dumps(lumi_doc_dict.get("sections", [])),
                        "concepts": json.dumps(lumi_doc_dict.get("concepts", [])),
                        "abstract": json.dumps(lumi_doc_dict.get("abstract", {})),
                        "references": json.dumps(lumi_doc_dict.get("references", [])),
                        "footnotes": json.dumps(lumi_doc_dict.get("footnotes", [])),
                    },
                )
                print(f"✅ Document UPDATE result: {result}")
            except Exception as e:
                logger.error(f"❌ Failed to update document {arxiv_id}: {e}")
                raise

            # Update status to SUMMARIZING
            await update_document_status(
                arxiv_id, version, LoadingStatus.SUMMARIZING.value
            )
            await manager.send_update(
                paper_key,
                version,
                {
                    "loadingStatus": LoadingStatus.SUMMARIZING.value,
                    "progress": "Generating summaries...",
                    "metadata": metadata_dict,
                },
            )

            # Stage 3: Generate summaries
            print(f"💡 Stage 3/3: Generating summaries for {arxiv_id}...")
            start_time = time.time()
            lumi_doc.summaries = await loop.run_in_executor(
                None, summaries.generate_lumi_summaries, lumi_doc
            )
            elapsed = time.time() - start_time

            logger.info(f"Summaries generated for {arxiv_id} in {elapsed:.1f}s")
            print(f"✅ Stage 3/3 complete: Generated summaries in {elapsed:.1f}s")

            # Update database with summaries
            lumi_doc_dict = convert_keys(asdict(lumi_doc), "snake_to_camel")

            print(f"🔍 Updating summaries at {version_id}")
            print(f"📝 Summaries data: {lumi_doc_dict.get('summaries', {})}")

            try:
                result = await db.query(
                    f"""
                    UPDATE {version_id} MERGE {{
                        summaries: $summaries,
                        loading_status: 'SUCCESS',
                        updated_timestamp: time::now()
                    }}
                """,
                    {"summaries": json.dumps(lumi_doc_dict.get("summaries", {}))},
                )
                print(f"✅ Summaries UPDATE result: {result}")
            except Exception as e:
                logger.error(f"❌ Failed to update summaries for {arxiv_id}: {e}")
                raise

            # Update to SUCCESS
            await update_document_status(arxiv_id, version, LoadingStatus.SUCCESS.value)

            # Fetch the complete document with parsed JSON fields
            complete_doc = await get_document_version(arxiv_id, version)
            if not complete_doc:
                logger.error(
                    f"Failed to fetch complete document for {arxiv_id} v{version}"
                )
                complete_doc = {}

            # Send full document to frontend (with camelCase keys)
            from shared.json_utils import convert_keys

            complete_doc_camelcase = convert_keys(complete_doc, "snake_to_camel")

            await manager.send_update(
                paper_key,
                version,
                {
                    "loadingStatus": LoadingStatus.SUCCESS.value,
                    "progress": "Complete!",
                    **complete_doc_camelcase,  # Include all document fields
                },
            )

            logger.info(f"✅ Import complete for {arxiv_id} v{version}")
            print(f"✅ BACKGROUND TASK COMPLETED: {arxiv_id} v{version}")

        except TimeoutError:
            logger.error(f"⏱️ TIMEOUT: {arxiv_id} v{version}")
            print(f"⏱️ BACKGROUND TASK TIMEOUT: {arxiv_id} v{version}")
            await self._handle_timeout(arxiv_id, version, paper_key, manager)
        except Exception as e:
            logger.exception(f"❌ ERROR: {arxiv_id} v{version}: {e}")
            print(f"❌ BACKGROUND TASK ERROR: {arxiv_id} v{version}: {e}")
            import traceback

            traceback.print_exc()  # Print full traceback to console
            await self._handle_error(arxiv_id, version, str(e), paper_key, manager)

    async def _handle_timeout(
        self, arxiv_id: str, version: str, paper_key: str, manager
    ):
        """Handle import timeout"""
        error_msg = "This paper cannot be loaded (time limit exceeded)"
        logger.error(f"Timeout for {arxiv_id} v{version}")

        await update_document_status(
            arxiv_id, version, LoadingStatus.TIMEOUT.value, error=error_msg
        )

        await manager.send_update(
            paper_key,
            version,
            {
                "loadingStatus": LoadingStatus.TIMEOUT.value,
                "loadingError": error_msg,
                "updatedTimestamp": datetime.utcnow().isoformat(),
            },
        )

    async def _handle_error(
        self, arxiv_id: str, version: str, error: str, paper_key: str, manager
    ):
        """Handle import error"""
        logger.error(f"Error importing {arxiv_id} v{version}: {error}")

        status = LoadingStatus.ERROR_DOCUMENT_LOAD.value
        if "quota" in error.lower():
            status = LoadingStatus.ERROR_DOCUMENT_LOAD_QUOTA_EXCEEDED.value
        elif "invalid response" in error.lower():
            status = LoadingStatus.ERROR_DOCUMENT_LOAD_INVALID_RESPONSE.value

        await update_document_status(arxiv_id, version, status, error=error)

        await manager.send_update(
            paper_key,
            version,
            {
                "loadingStatus": status,
                "loadingError": error,
                "updatedTimestamp": datetime.utcnow().isoformat(),
            },
        )
