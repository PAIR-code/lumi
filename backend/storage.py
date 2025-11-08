import logging
from pathlib import Path
from typing import cast

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from config import settings

logger = logging.getLogger(__name__)

# Global S3 client
s3_client = None


async def init_storage():
    """Initialize storage client (MinIO/S3 or local filesystem)"""
    global s3_client

    if settings.STORAGE_MODE == "s3":
        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            use_ssl=settings.S3_USE_SSL,
            config=Config(signature_version="s3v4"),
        )

        # Create bucket if it doesn't exist
        try:
            s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
            logger.info(f"Using existing S3 bucket: {settings.S3_BUCKET_NAME}")
        except ClientError:
            s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
            logger.info(f"Created S3 bucket: {settings.S3_BUCKET_NAME}")
    else:
        # Local filesystem mode
        local_path = Path(settings.LOCAL_STORAGE_PATH)
        local_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Using local storage: {local_path.absolute()}")


def get_storage_client():
    """Get storage client for dependency injection"""
    return s3_client


def upload_file(file_path: str, storage_key: str) -> str:
    """
    Upload file to storage

    Args:
        file_path: Local file path to upload
        storage_key: Storage key (e.g., 'arxiv_id/images/file.png')

    Returns:
        Storage URL or local path
    """
    if settings.STORAGE_MODE == "s3":
        s3_client.upload_file(
            Filename=file_path, Bucket=settings.S3_BUCKET_NAME, Key=storage_key
        )
        logger.info(f"Uploaded to S3: {storage_key}")
        return storage_key
    else:
        # Local filesystem
        dest_path = Path(settings.LOCAL_STORAGE_PATH) / storage_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        import shutil

        shutil.copy2(file_path, dest_path)
        logger.info(f"Copied to local storage: {dest_path}")
        return str(dest_path)


def download_file(storage_key: str, local_path: str):
    """
    Download file from storage

    Args:
        storage_key: Storage key
        local_path: Local destination path
    """
    if settings.STORAGE_MODE == "s3":
        s3_client.download_file(
            Bucket=settings.S3_BUCKET_NAME, Key=storage_key, Filename=local_path
        )
        logger.info(f"Downloaded from S3: {storage_key}")
    else:
        # Local filesystem
        src_path = Path(settings.LOCAL_STORAGE_PATH) / storage_key
        import shutil

        shutil.copy2(src_path, local_path)
        logger.info(f"Copied from local storage: {src_path}")


def get_presigned_url(storage_key: str, expiration: int = 3600) -> str:
    """
    Generate presigned URL for file access

    Args:
        storage_key: Storage key
        expiration: URL expiration time in seconds (default: 1 hour)

    Returns:
        Presigned URL or local file path
    """
    if settings.STORAGE_MODE == "s3":
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": storage_key},
            ExpiresIn=expiration,
        )
        return cast(str, url)
    else:
        # Local filesystem - return relative path for frontend
        return f"/files/{storage_key}"


def delete_file(storage_key: str):
    """Delete file from storage"""
    if settings.STORAGE_MODE == "s3":
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=storage_key)
        logger.info(f"Deleted from S3: {storage_key}")
    else:
        # Local filesystem
        file_path = Path(settings.LOCAL_STORAGE_PATH) / storage_key
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted from local storage: {file_path}")
