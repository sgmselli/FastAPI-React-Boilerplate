import logging
from functools import cached_property, lru_cache
from io import BytesIO
from typing import BinaryIO
import boto3
from botocore.config import Config
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings
from app.exceptions.s3 import S3ClientException

logger = logging.getLogger(__name__)

class S3Client:
    def __init__(self):
        self.bucket_name = settings.bucket_name

    # Built on first use, inside each method's try, so a misconfigured bucket raises
    # S3ClientException there rather than breaking every request that depends on this
    @cached_property
    def s3(self):
        return boto3.client(
            "s3",
            region_name=settings.bucket_region,
            endpoint_url=settings.bucket_endpoint_url,
            aws_access_key_id = settings.bucket_access_key_id,
            aws_secret_access_key = settings.bucket_secret_key,
            config=Config(s3={'addressing_style': 'virtual'})
        )

    def generate_presigned_url(self, object_name: str, expires_in: int = 3600) -> str:
        logger.info("Generating presigned URL for %s", object_name)

        try:
            url = self.s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": object_name},
                ExpiresIn=expires_in,
            )
            return url
        except Exception:
            logger.exception("Error generating presigned URL for %s", object_name)
            raise S3ClientException()

    async def upload_fileobj(self, object_name: str, file: bytes | BinaryIO, content_type: str) -> None:
        logger.info("Uploading %s (%s)", object_name, content_type)

        file_obj = BytesIO(file) if isinstance(file, bytes) else file

        try:
            # boto3 is synchronous, so run it in a thread rather than blocking the event loop
            await run_in_threadpool(
                self.s3.upload_fileobj,
                file_obj,
                self.bucket_name,
                object_name,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": "public, max-age=31536000, immutable",
                }
            )
        except Exception:
            logger.exception("Error uploading object %s", object_name)
            raise S3ClientException()

    async def delete_object(self, object_name: str) -> None:
        logger.info("Deleting %s", object_name)
        try:
            await run_in_threadpool(self.s3.delete_object, Bucket=self.bucket_name, Key=object_name)
        except Exception:
            logger.exception("Error deleting object %s", object_name)
            raise S3ClientException()

    async def delete_object_quietly(self, object_name: str) -> None:
        try:
            await self.delete_object(object_name)
        except S3ClientException:
            logger.error("Failed to delete object %s, it is now orphaned in the bucket", object_name)
@lru_cache
def get_s3_client() -> S3Client:
    return S3Client()