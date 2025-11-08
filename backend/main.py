import logging
from pathlib import Path

from api import documents, feedback, metadata, papers, queries, websockets
from config import settings
from database import close_db, connect_db
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from storage import init_storage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Lumi Backend API",
    description="Cloud-agnostic backend for Lumi academic paper reader",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for local storage mode
if settings.STORAGE_MODE == "local":
    local_path = Path(settings.LOCAL_STORAGE_PATH)
    if local_path.exists():
        app.mount("/files", StaticFiles(directory=str(local_path)), name="files")
        logger.info(f"Serving static files from {local_path}")
    else:
        logger.warning(
            f"Local storage path {local_path} does not exist, static files not mounted"
        )

# Mount assets folder for tutorial images and other static assets
# In Docker, the assets folder is mounted at /app/assets
assets_path = (
    Path("/app/assets")
    if Path("/app/assets").exists()
    else Path(__file__).parent.parent / "assets"
)
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
    logger.info(f"Serving assets from {assets_path}")
else:
    logger.warning(f"Assets path {assets_path} does not exist")


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and storage connections"""
    logger.info("Starting Lumi backend...")
    try:
        await connect_db()
    except Exception as e:
        logger.warning(f"Could not connect to SurrealDB (this is OK for Phase 1): {e}")
    try:
        await init_storage()
    except Exception as e:
        logger.warning(f"Could not initialize storage (this is OK for Phase 1): {e}")
    logger.info("Lumi backend started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Close database and storage connections"""
    logger.info("Shutting down Lumi backend...")
    await close_db()
    logger.info("Lumi backend shutdown complete")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {"status": "healthy", "version": "1.0.0"}


# Include routers
app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["metadata"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(websockets.router, prefix="/ws", tags=["websockets"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )
