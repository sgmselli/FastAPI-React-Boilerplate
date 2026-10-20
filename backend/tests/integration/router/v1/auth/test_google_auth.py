from unittest.mock import AsyncMock

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.router.v1.auth import google_auth
from app.services.user_services import UserService


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

        user = await UserService(db_session).get_user_by_email("brandnew@example.com")
        assert user.google_id == "google-abc"
        assert user.password is None
        assert user.email_verified_at is not None

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
        user = await UserService(db_session).get_user_by_email("linkme@example.com")
        assert user.google_id == "google-link"
        assert user.password is not None

    async def test_linking_an_unverified_user_verifies_them_and_drops_the_password(
        self, client: AsyncClient, db_session: AsyncSession, make_user, mocker
    ):
        # Someone could register the owner's email with a password of their
        # own and never verify it. Google proves who owns the email, so that
        # password must not carry over into the now-verified account.
        await make_user(email="squatted@example.com", email_verified=False)
        mock_authorize(
            mocker,
            return_value=fake_token(google_id="google-owner", email="squatted@example.com"),
        )

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 302
        user = await UserService(db_session).get_user_by_email("squatted@example.com")
        assert user.google_id == "google-owner"
        assert user.email_verified_at is not None
        assert user.password is None

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

    async def test_new_user_gets_the_google_name_as_a_suggestion_not_a_saved_name(
        self, client: AsyncClient, db_session: AsyncSession, mocker
    ):
        mock_authorize(mocker, return_value=fake_token(email="suggest@example.com", name="Jane O'Brien"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        # Fragment, not query string - it never reaches a server or an access log
        assert response.headers["location"].endswith("/auth/callback#name=Jane%20O%27Brien")
        user = await UserService(db_session).get_user_by_email("suggest@example.com")
        assert user.profile.name is None

    async def test_linked_user_without_a_name_gets_the_suggestion(
        self, client: AsyncClient, make_user, mocker
    ):
        await make_user(email="link-nameless@example.com", name=None)
        mock_authorize(mocker, return_value=fake_token(google_id="google-nameless", email="link-nameless@example.com"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.headers["location"].endswith("/auth/callback#name=Google%20User")

    async def test_no_suggestion_when_the_profile_already_has_a_name(
        self, client: AsyncClient, make_user, mocker
    ):
        await make_user(email="named-google@example.com", name="Saved Name", google_id="google-named")
        mock_authorize(mocker, return_value=fake_token(google_id="google-named", email="named-google@example.com"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.headers["location"].endswith("/auth/callback")

    async def test_no_suggestion_when_google_sends_no_name(
        self, client: AsyncClient, mocker
    ):
        mock_authorize(mocker, return_value=fake_token(email="no-name@example.com", name=None))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.headers["location"].endswith("/auth/callback")

    async def test_missing_userinfo_returns_400(self, client: AsyncClient, mocker):
        mock_authorize(mocker, return_value={})

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 400

    async def test_provider_error_returns_400(self, client: AsyncClient, mocker):
        mock_authorize(mocker, side_effect=Exception("provider unreachable"))

        response = await client.get("/api/v1/auth/google/callback", follow_redirects=False)

        assert response.status_code == 400