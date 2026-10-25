from unittest.mock import MagicMock
import pytest

from app.exceptions.s3 import S3ClientException
from app.external_services.s3_client import S3Client


def make_client() -> S3Client:
    # Replaces the lazily built boto3 client, so no real one is ever created
    client = S3Client()
    client.s3 = MagicMock()
    client.bucket_name = "test-bucket"
    return client


class TestUploadFileobj:
    async def test_passes_content_type_and_cache_header(self):
        client = make_client()

        await client.upload_fileobj("key.webp", b"data", "image/webp")

        _, bucket, key = client.s3.upload_fileobj.call_args.args
        assert (bucket, key) == ("test-bucket", "key.webp")
        assert client.s3.upload_fileobj.call_args.kwargs["ExtraArgs"] == {
            "ContentType": "image/webp",
            "CacheControl": "public, max-age=31536000, immutable",
        }

    async def test_wraps_bytes_in_a_file_object(self):
        client = make_client()

        await client.upload_fileobj("key.webp", b"data", "image/webp")

        assert client.s3.upload_fileobj.call_args.args[0].read() == b"data"

    async def test_failure_raises_s3_client_exception(self):
        client = make_client()
        client.s3.upload_fileobj.side_effect = Exception("boom")

        with pytest.raises(S3ClientException):
            await client.upload_fileobj("key.webp", b"data", "image/webp")


class TestDeleteObject:
    async def test_deletes_from_the_bucket(self):
        client = make_client()

        await client.delete_object("key.webp")

        client.s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key="key.webp")

    async def test_failure_raises_s3_client_exception(self):
        client = make_client()
        client.s3.delete_object.side_effect = Exception("boom")

        with pytest.raises(S3ClientException):
            await client.delete_object("key.webp")


class TestDeleteObjectQuietly:
    async def test_deletes_from_the_bucket(self):
        client = make_client()

        await client.delete_object_quietly("key.webp")

        client.s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key="key.webp")

    async def test_failure_is_swallowed(self):
        client = make_client()
        client.s3.delete_object.side_effect = Exception("boom")

        await client.delete_object_quietly("key.webp")


class TestGeneratePresignedUrl:
    def test_signs_a_get_for_the_key(self):
        client = make_client()
        client.s3.generate_presigned_url.return_value = "https://signed"

        assert client.generate_presigned_url("key.webp", expires_in=60) == "https://signed"
        client.s3.generate_presigned_url.assert_called_once_with(
            ClientMethod="get_object",
            Params={"Bucket": "test-bucket", "Key": "key.webp"},
            ExpiresIn=60,
        )

    def test_failure_raises_s3_client_exception(self):
        client = make_client()
        client.s3.generate_presigned_url.side_effect = Exception("boom")

        with pytest.raises(S3ClientException):
            client.generate_presigned_url("key.webp")
