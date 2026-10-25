from unittest.mock import AsyncMock, MagicMock

from app.db.base_class import Base


def make_mock_session(first_return: Base | None = None) -> MagicMock:
    """
    AsyncSession stand-in whose execute().scalars().first() resolves to
    `first_return`. Covers the single-row lookup shape used throughout
    the service layer (get_user_by_id/email/google_id and friends).

    session.add is a plain MagicMock (Session.add is sync even on
    AsyncSession); delete/flush/commit/refresh/execute are AsyncMocks.

    Services flush rather than commit - the request-scoped transaction is
    committed by get_session - but commit and refresh are still stubbed for
    any caller that owns its own transaction.
    """
    result = MagicMock()
    result.scalars.return_value.first.return_value = first_return

    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session

def make_mock_s3_client() -> MagicMock:
    """
    S3Client stand-in. upload_fileobj, delete_object and delete_object_quietly
    are async on the real client, so they're AsyncMocks here; generate_presigned_url is sync and
    returns a URL built from the key so tests can assert which key it signed.
    """
    s3_client = MagicMock()
    s3_client.upload_fileobj = AsyncMock()
    s3_client.delete_object = AsyncMock()
    s3_client.delete_object_quietly = AsyncMock()
    s3_client.generate_presigned_url = MagicMock(side_effect=lambda key, **_: f"https://bucket.test/{key}?signed")
    return s3_client
