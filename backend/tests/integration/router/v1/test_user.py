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


class TestUpdateCurrentUser:
    async def test_returns_200_with_updated_user(self, client: AsyncClient, make_user):
        user = await make_user(email="update@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={"name": "  New Name  "})

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "New Name"
        assert body["email"] == "update@example.com"
        assert "password" not in body

    async def test_persists_new_name(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="update-persist@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.patch("/api/v1/user/current", json={"name": "New Name"})

        db_session.expire_all()
        found = await get_user_by_email("update-persist@example.com", db_session)
        assert found.name == "New Name"

    async def test_email_in_body_is_ignored(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="keep-email@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch(
            "/api/v1/user/current",
            json={"name": "New Name", "email": "hijack@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "keep-email@example.com"
        db_session.expire_all()
        found = await get_user_by_email("keep-email@example.com", db_session)
        assert found.name == "New Name"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.patch("/api/v1/user/current", json={"name": "New Name"})
        assert response.status_code == 401

    async def test_invalid_name_returns_422_and_does_not_persist(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="invalid-name@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={"name": "Jane@Doe!"})

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "name"]
        db_session.expire_all()
        found = await get_user_by_email("invalid-name@example.com", db_session)
        assert found.name == "Old Name"

    async def test_missing_name_returns_422(self, client: AsyncClient, make_user):
        user = await make_user(email="missing-name@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={})

        assert response.status_code == 422
