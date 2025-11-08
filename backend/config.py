import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


def parse_cors_origins(value: str) -> list[str]:
    """Parse CORS_ORIGINS from JSON string or comma-separated string"""
    if not value or not value.strip():
        return ["http://localhost:4201", "http://localhost:3000"]
    # Try parsing as JSON first
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(origin) for origin in parsed]
    except (json.JSONDecodeError, ValueError):
        pass
    # If not JSON, treat as comma-separated string
    return [origin.strip() for origin in value.split(",") if origin.strip()]


class Settings(BaseSettings):
    """Application configuration using environment variables"""

    # Application
    APP_NAME: str = "Lumi Backend"
    DEBUG: bool = False

    # CORS - use string type to avoid pydantic-settings auto JSON parsing
    # Field alias maps CORS_ORIGINS env var to this field
    cors_origins_str: str = Field(
        default="http://localhost:4201,http://localhost:3000", alias="CORS_ORIGINS"
    )

    @field_validator("cors_origins_str", mode="before")
    @classmethod
    def parse_cors_origins_str(cls, v: str | list[str] | None) -> str:
        """Parse CORS_ORIGINS from JSON string, comma-separated string, or list"""
        if v is None:
            return "http://localhost:4201,http://localhost:3000"
        if isinstance(v, list):
            return ",".join(str(origin) for origin in v)
        return str(v)

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Parse CORS_ORIGINS string into a list"""
        return parse_cors_origins(self.cors_origins_str)

    # SurrealDB
    SURREAL_URL: str = "ws://localhost:8000/rpc"
    SURREAL_NAMESPACE: str = "lumi"
    SURREAL_DATABASE: str = "lumi"
    SURREAL_USERNAME: str = "root"
    SURREAL_PASSWORD: str = "root"

    # MinIO / S3
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "lumi-papers"
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False

    # Storage mode: "local" or "s3"
    STORAGE_MODE: str = "local"
    LOCAL_STORAGE_PATH: str = "../local_image_bucket"

    # Import Pipeline
    MAX_LATEX_CHARACTER_COUNT: int = 300000
    ARXIV_ID_MAX_LENGTH: int = 20
    MAX_QUERY_LENGTH: int = 1000
    MAX_HIGHLIGHT_LENGTH: int = 100000
    MAX_USER_FEEDBACK_LENGTH: int = 1000
    SKIP_LICENSE_CHECK: bool = True

    # Background Tasks
    IMPORT_TIMEOUT_SECONDS: int = 540
    IMPORT_TIMEOUT_BUFFER: int = 10


settings = Settings()
