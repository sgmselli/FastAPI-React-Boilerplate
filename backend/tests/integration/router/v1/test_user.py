from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.services.user_services import get_user_by_email


class TestRegister:
    async def test_returns_201_with_user_shape(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "new@example.com",
                "name": "New User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "new@example.com"
        assert body["name"] == "New User"
        assert "password" not in body

    async def test_persists_user(self, client: AsyncClient, db_session: AsyncSession):
        await client.post(
            "/api/v1/user/register",
            json={
                "email": "persisted@example.com",
                "name": "Persisted User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        user = await get_user_by_email("persisted@example.com", db_session)
        assert user.name == "Persisted User"

    async def test_duplicate_email_returns_409(self, client: AsyncClient, make_user):
        await make_user(email="dupe@example.com")

        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "dupe@example.com",
                "name": "Another User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 409

    async def test_invalid_payload_returns_422(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "not-an-email",
                "name": "X",
                "password": "weak",
                "confirm_password": "weak",
            },
        )

        assert response.status_code == 422


class TestCurrentUser:
    async def test_authenticated_returns_user(self, client: AsyncClient, make_user):
        user = await make_user(email="current@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 200
        assert response.json()["email"] == "current@example.com"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.get("/api/v1/user/current")
        assert response.status_code == 401

    async def test_garbage_cookie_returns_401(self, client: AsyncClient):
        client.cookies.set("access_token", "not-a-jwt")

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 401

    async def test_valid_token_for_deleted_user_returns_404(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="deleted@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await db_session.delete(user)
        await db_session.commit()

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 404
