from httpx import AsyncClient

from app.auth.jwt import create_access_token, create_refresh_token


class TestLogin:
    async def test_valid_credentials_sets_cookies(
        self, client: AsyncClient, make_user, shared_password: str
    ):
        await make_user(email="login@example.com")

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "login@example.com", "password": shared_password},
        )

        assert response.status_code == 200
        assert response.cookies.get("access_token") is not None
        assert response.cookies.get("refresh_token") is not None

    async def test_wrong_password_returns_401(self, client: AsyncClient, make_user):
        await make_user(email="login2@example.com")

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "login2@example.com", "password": "WrongPass1!"},
        )

        assert response.status_code == 401

    async def test_unknown_email_returns_401(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@example.com", "password": "WhoCares1!"},
        )

        assert response.status_code == 401

    async def test_google_only_account_returns_401_not_500(
        self, client: AsyncClient, make_user
    ):
        # Regression test: user.password is None for google-only accounts -
        # login must reject with 401, not raise inside verify_password
        # (see password_auth.py - user.password is None short-circuits
        # before verify_password is called).
        await make_user(email="google-only@example.com", google_id="g-1", password=None)

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "google-only@example.com", "password": "Anything1!"},
        )

        assert response.status_code == 401

    async def test_unknown_email_and_wrong_password_share_detail_message(
        self, client: AsyncClient, make_user
    ):
        # Both failure modes must be indistinguishable, otherwise the
        # endpoint leaks which emails are registered.
        await make_user(email="known@example.com")

        wrong_password = await client.post(
            "/api/v1/auth/login",
            data={"username": "known@example.com", "password": "WrongPass1!"},
        )
        unknown_email = await client.post(
            "/api/v1/auth/login",
            data={"username": "unknown@example.com", "password": "WrongPass1!"},
        )

        assert wrong_password.json()["detail"] == unknown_email.json()["detail"]


class TestRefresh:
    async def test_valid_refresh_token_returns_new_access_cookie(
        self, client: AsyncClient, make_user
    ):
        user = await make_user(email="refresh@example.com")
        client.cookies.set("refresh_token", create_refresh_token({"sub": str(user.id)}))

        response = await client.post("/api/v1/auth/refresh")

        assert response.status_code == 200
        assert response.cookies.get("access_token") is not None

    async def test_missing_refresh_token_returns_401(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 401

    async def test_malformed_refresh_token_returns_401(self, client: AsyncClient):
        client.cookies.set("refresh_token", "not-a-jwt")

        response = await client.post("/api/v1/auth/refresh")

        assert response.status_code == 401

    async def test_access_token_rejected_as_refresh_token(
        self, client: AsyncClient, make_user
    ):
        # signed with the access secret, not the refresh secret - decode
        # must fail even though it's a structurally valid JWT.
        user = await make_user(email="refresh2@example.com")
        client.cookies.set("refresh_token", create_access_token({"sub": str(user.id)}))

        response = await client.post("/api/v1/auth/refresh")

        assert response.status_code == 401


class TestLogout:
    async def test_clears_both_cookies(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/logout")

        assert response.status_code == 200
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any(h.startswith("access_token=") for h in set_cookie_headers)
        assert any(h.startswith("refresh_token=") for h in set_cookie_headers)
