from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.services.user_services import UserService


class TestUpdateCurrentUserProfile:
    async def test_returns_200_with_updated_user(self, client: AsyncClient, make_user):
        user = await make_user(email="update@example.com", first_name="Old", last_name="Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"first_name": "  New  ", "last_name": "  Name  "})

        assert response.status_code == 200
        body = response.json()
        assert body["profile"] == {"first_name": "New", "last_name": "Name", "is_profile_completed": True}
        assert body["display_name"] == "New Name"
        assert body["email"] == "update@example.com"
        assert "password" not in body

    async def test_completes_an_empty_profile(self, client: AsyncClient, make_user):
        user = await make_user(email="complete@example.com", first_name=None, last_name=None)
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"first_name": "New", "last_name": "Name"})

        assert response.status_code == 200
        assert response.json()["profile"]["is_profile_completed"] is True

    async def test_persists_new_name(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="update-persist@example.com", first_name="Old", last_name="Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.patch("/api/v1/profile/current", json={"first_name": "New", "last_name": "Name"})

        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("update-persist@example.com")
        assert (found.profile.first_name, found.profile.last_name) == ("New", "Name")

    async def test_unknown_fields_in_body_are_ignored(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="keep-email@example.com", first_name="Old", last_name="Name")
        other = await make_user(email="other@example.com", first_name="Other", last_name="User")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch(
            "/api/v1/profile/current",
            json={"first_name": "New", "last_name": "Name", "email": "hijack@example.com", "user_id": other.id},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "keep-email@example.com"
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("keep-email@example.com")
        assert (found.profile.first_name, found.profile.last_name) == ("New", "Name")
        untouched = await UserService(db_session).get_user_by_email("other@example.com")
        assert untouched.profile.first_name == "Other"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.patch("/api/v1/profile/current", json={"first_name": "New", "last_name": "Name"})
        assert response.status_code == 401

    async def test_invalid_name_returns_422_and_does_not_persist(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="invalid-name@example.com", first_name="Old", last_name="Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"first_name": "Jane@", "last_name": "Doe"})

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "first_name"]
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("invalid-name@example.com")
        assert (found.profile.first_name, found.profile.last_name) == ("Old", "Name")

    async def test_missing_name_returns_422(self, client: AsyncClient, make_user):
        user = await make_user(email="missing-name@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={})

        assert response.status_code == 422

    async def test_missing_last_name_returns_422(self, client: AsyncClient, make_user):
        user = await make_user(email="missing-last-name@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"first_name": "Jane"})

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "last_name"]
