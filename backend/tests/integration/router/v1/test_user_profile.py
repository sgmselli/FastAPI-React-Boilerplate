from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.services.user_services import UserService


class TestUpdateCurrentUserProfile:
    async def test_returns_200_with_updated_user(self, client: AsyncClient, make_user):
        user = await make_user(email="update@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"name": "  New Name  "})

        assert response.status_code == 200
        body = response.json()
        assert body["profile"] == {"name": "New Name", "is_profile_completed": True}
        assert body["email"] == "update@example.com"
        assert "password" not in body

    async def test_completes_an_empty_profile(self, client: AsyncClient, make_user):
        user = await make_user(email="complete@example.com", name=None)
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"name": "New Name"})

        assert response.status_code == 200
        assert response.json()["profile"]["is_profile_completed"] is True

    async def test_persists_new_name(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="update-persist@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.patch("/api/v1/profile/current", json={"name": "New Name"})

        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("update-persist@example.com")
        assert found.profile.name == "New Name"

    async def test_unknown_fields_in_body_are_ignored(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="keep-email@example.com", name="Old Name")
        other = await make_user(email="other@example.com", name="Other")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch(
            "/api/v1/profile/current",
            json={"name": "New Name", "email": "hijack@example.com", "user_id": other.id},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "keep-email@example.com"
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("keep-email@example.com")
        assert found.profile.name == "New Name"
        untouched = await UserService(db_session).get_user_by_email("other@example.com")
        assert untouched.profile.name == "Other"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.patch("/api/v1/profile/current", json={"name": "New Name"})
        assert response.status_code == 401

    async def test_invalid_name_returns_422_and_does_not_persist(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="invalid-name@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"name": "Jane@Doe!"})

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "name"]
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("invalid-name@example.com")
        assert found.profile.name == "Old Name"

    async def test_missing_name_returns_422(self, client: AsyncClient, make_user):
        user = await make_user(email="missing-name@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={})

        assert response.status_code == 422