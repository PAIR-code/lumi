"""
SurrealDB schema initialization script

Defines tables, indexes, and relationships for the Lumi database.
Run this script once to set up the database schema.
"""

import asyncio
import logging

from database import connect_db, get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_schema():
    """Initialize SurrealDB schema"""

    await connect_db()
    db = get_db()

    logger.info("Creating SurrealDB schema...")

    # Define arxiv_docs table
    await db.query("""
        DEFINE TABLE arxiv_docs SCHEMAFULL;
        DEFINE FIELD arxiv_id ON TABLE arxiv_docs TYPE string;
        DEFINE FIELD loading_status ON TABLE arxiv_docs TYPE string;
        DEFINE FIELD updated_timestamp ON TABLE arxiv_docs TYPE datetime;

        DEFINE INDEX arxiv_docs_arxiv_id ON TABLE arxiv_docs COLUMNS arxiv_id UNIQUE;
        DEFINE INDEX arxiv_docs_status ON TABLE arxiv_docs COLUMNS loading_status;
        DEFINE INDEX arxiv_docs_updated ON TABLE arxiv_docs COLUMNS updated_timestamp;
    """)
    logger.info("✓ Created table: arxiv_docs")

    # Define document_versions table (replaces Firestore subcollection)
    await db.query("""
        DEFINE TABLE document_versions SCHEMAFULL;
        DEFINE FIELD arxiv_id ON TABLE document_versions TYPE string;
        DEFINE FIELD version ON TABLE document_versions TYPE string;
        DEFINE FIELD loading_status ON TABLE document_versions TYPE string;
        DEFINE FIELD updated_timestamp ON TABLE document_versions TYPE datetime;
        DEFINE FIELD loading_error ON TABLE document_versions TYPE option<string>;

        -- Metadata
        DEFINE FIELD metadata ON TABLE document_versions TYPE option<object>;

        -- LumiDoc fields
        DEFINE FIELD markdown ON TABLE document_versions TYPE option<string>;
        DEFINE FIELD sections ON TABLE document_versions TYPE option<array>;
        DEFINE FIELD concepts ON TABLE document_versions TYPE option<array>;
        DEFINE FIELD abstract ON TABLE document_versions TYPE option<object>;
        DEFINE FIELD references ON TABLE document_versions TYPE option<array>;
        DEFINE FIELD footnotes ON TABLE document_versions TYPE option<array>;
        DEFINE FIELD summaries ON TABLE document_versions TYPE option<object>;

        -- Relationship to parent document
        DEFINE FIELD arxiv_doc ON TABLE document_versions TYPE record<arxiv_docs>;

        -- Indexes
        DEFINE INDEX document_versions_arxiv_version ON TABLE document_versions COLUMNS arxiv_id, version UNIQUE;
        DEFINE INDEX document_versions_status ON TABLE document_versions COLUMNS loading_status;
        DEFINE INDEX document_versions_updated ON TABLE document_versions COLUMNS updated_timestamp;
    """)
    logger.info("✓ Created table: document_versions")

    # Define arxiv_collections table
    await db.query("""
        DEFINE TABLE arxiv_collections SCHEMAFULL;
        DEFINE FIELD collection_id ON TABLE arxiv_collections TYPE string;
        DEFINE FIELD title ON TABLE arxiv_collections TYPE string;
        DEFINE FIELD summary ON TABLE arxiv_collections TYPE string;
        DEFINE FIELD paper_ids ON TABLE arxiv_collections TYPE array<string>;
        DEFINE FIELD priority ON TABLE arxiv_collections TYPE int;

        DEFINE INDEX arxiv_collections_id ON TABLE arxiv_collections COLUMNS collection_id UNIQUE;
        DEFINE INDEX arxiv_collections_priority ON TABLE arxiv_collections COLUMNS priority;
    """)
    logger.info("✓ Created table: arxiv_collections")

    # Define query_logs table
    await db.query("""
        DEFINE TABLE query_logs SCHEMAFULL;
        DEFINE FIELD created_timestamp ON TABLE query_logs TYPE datetime;
        DEFINE FIELD arxiv_id ON TABLE query_logs TYPE string;
        DEFINE FIELD version ON TABLE query_logs TYPE string;
        DEFINE FIELD answer ON TABLE query_logs TYPE object;

        DEFINE INDEX query_logs_timestamp ON TABLE query_logs COLUMNS created_timestamp;
        DEFINE INDEX query_logs_arxiv_id ON TABLE query_logs COLUMNS arxiv_id;
    """)
    logger.info("✓ Created table: query_logs")

    # Define user_feedback table
    await db.query("""
        DEFINE TABLE user_feedback SCHEMAFULL;
        DEFINE FIELD user_feedback_text ON TABLE user_feedback TYPE string;
        DEFINE FIELD created_timestamp ON TABLE user_feedback TYPE datetime;
        DEFINE FIELD arxiv_id ON TABLE user_feedback TYPE option<string>;

        DEFINE INDEX user_feedback_timestamp ON TABLE user_feedback COLUMNS created_timestamp;
    """)
    logger.info("✓ Created table: user_feedback")

    # Define import_attempts table (for throttling)
    await db.query("""
        DEFINE TABLE import_attempts SCHEMAFULL;
        DEFINE FIELD timestamp ON TABLE import_attempts TYPE datetime;
        DEFINE FIELD succeeded ON TABLE import_attempts TYPE bool;

        DEFINE INDEX import_attempts_timestamp ON TABLE import_attempts COLUMNS timestamp;
    """)
    logger.info("✓ Created table: import_attempts")

    logger.info("Schema initialization complete!")


if __name__ == "__main__":
    asyncio.run(init_schema())
