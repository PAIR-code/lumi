import logging
from contextlib import asynccontextmanager

from config import settings
from surrealdb import Surreal

logger = logging.getLogger(__name__)

# Global database client
db: Surreal = None


async def connect_db():
    """Initialize SurrealDB connection"""
    global db
    try:
        db = Surreal(settings.SURREAL_URL)
        await db.connect()
        await db.signin(
            {
                "user": settings.SURREAL_USERNAME,
                "pass": settings.SURREAL_PASSWORD,
            }
        )
        await db.use(settings.SURREAL_NAMESPACE, settings.SURREAL_DATABASE)
        logger.info(f"Connected to SurrealDB at {settings.SURREAL_URL}")
    except Exception as e:
        logger.error(f"Failed to connect to SurrealDB: {e}")
        raise


async def close_db():
    """Close SurrealDB connection"""
    global db
    if db:
        await db.close()
        logger.info("Closed SurrealDB connection")


def get_db() -> Surreal:
    """Get database instance for dependency injection"""
    return db


@asynccontextmanager
async def transaction():
    """Context manager for SurrealDB transactions"""
    await db.query("BEGIN TRANSACTION")
    try:
        yield db
        await db.query("COMMIT TRANSACTION")
    except Exception as e:
        await db.query("CANCEL TRANSACTION")
        logger.error(f"Transaction failed: {e}")
        raise
