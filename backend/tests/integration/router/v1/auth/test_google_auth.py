from unittest.mock import AsyncMock

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.router.v1.auth import google_auth
from app.services.user_services import get_user_by_email


def fake_token(google_id="google-abc", email="googleuser@example.com", name="Google User"):
    return {"userinfo": {"sub": google_id, "email": email, "name": name}}


def mock_authorize(mocker, **kwargs):
    return mocker.patch.object(
        google_auth.google_oath,
        "authorize_access_token",
        new=AsyncMock(**kwargs),
    )


class TestGoogleCallback:
    async def test_creates_new_user_when_neither_google_id_nor_email_exist(
        self, client: AsyncClient, db_session: AsyncSession, mocker
    ):
        mock_authorize(mocker, return_value=fake_token(email="brandnew@example.com"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 302
        assert "/auth/callback" in response.headers["location"]
        assert response.cookies.get("access_token") is not None

        user = await get_user_by_email("brandnew@example.com", db_session)
        assert user.google_id == "google-abc"
        assert user.password is None

    async def test_links_google_id_to_existing_email_user(
        self, client: AsyncClient, db_session: AsyncSession, make_user, mocker
    ):
        await make_user(email="linkme@example.com", google_id=None)
        mock_authorize(
            mocker,
            return_value=fake_token(google_id="google-link", email="linkme@example.com"),
        )

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 302
        user = await get_user_by_email("linkme@example.com", db_session)
        assert user.google_id == "google-link"

    async def test_logs_in_existing_google_user(
        self, client: AsyncClient, make_user, mocker
    ):
        await make_user(email="existing-google@example.com", google_id="google-existing")
        mock_authorize(
            mocker,
            return_value=fake_token(
                google_id="google-existing", email="existing-google@example.com"
            ),
        )

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 302
        assert response.cookies.get("access_token") is not None

    async def test_missing_userinfo_returns_400(self, client: AsyncClient, mocker):
        mock_authorize(mocker, return_value={})

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 400

    async def test_provider_error_returns_400(self, client: AsyncClient, mocker):
        mock_authorize(mocker, side_effect=Exception("provider unreachable"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 400