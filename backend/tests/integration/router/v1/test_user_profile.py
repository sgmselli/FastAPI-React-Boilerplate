from io import BytesIO
import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.core.config import settings
from app.exceptions.s3 import S3ClientException
from app.services.user_services import UserService


class TestUpdateCurrentUserProfile:
    async def test_returns_200_with_updated_user(self, client: AsyncClient, make_user):
        user = await make_user(email="update@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/profile/current", json={"name": "  New Name  "})

        assert response.status_code == 200
        body = response.json()
        assert body["profile"] == {"name": "New Name", "is_profile_completed": True, "profile_picture_url": None}
        assert body["display_name"] == "New Name"
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

def make_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (100, 100), "red").save(output, format="PNG")
    return output.getvalue()


class TestUpdateCurrentUserProfilePicture:
    async def test_returns_200_and_persists_key(self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession):
        user = await make_user(email="picture@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", make_png(), "image/png")})

        assert response.status_code == 200
        assert response.json()["email"] == "picture@example.com"
        uploaded_key = s3_client.upload_fileobj.await_args.args[0]
        assert response.json()["profile"]["profile_picture_url"] == f"https://bucket.test/{uploaded_key}?signed"
        assert "profile_picture_key" not in response.json()["profile"]
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("picture@example.com")
        assert found.profile.profile_picture_key == uploaded_key

    async def test_replacing_deletes_previous_picture(self, client: AsyncClient, s3_client, make_user):
        user = await make_user(email="replace@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.put("/api/v1/profile/current/picture", files={"file": ("a.png", make_png(), "image/png")})
        first_key = s3_client.upload_fileobj.await_args.args[0]
        await client.put("/api/v1/profile/current/picture", files={"file": ("b.png", make_png(), "image/png")})

        s3_client.delete_object_quietly.assert_awaited_once_with(first_key)

    async def test_missing_cookie_returns_401(self, client: AsyncClient, s3_client):
        response = await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", make_png(), "image/png")})

        assert response.status_code == 401
        s3_client.upload_fileobj.assert_not_awaited()

    async def test_missing_file_returns_422(self, client: AsyncClient, s3_client, make_user):
        user = await make_user(email="no-file@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.put("/api/v1/profile/current/picture")

        assert response.status_code == 422
        s3_client.upload_fileobj.assert_not_awaited()

    async def test_non_image_returns_422_and_does_not_persist(
        self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="not-image@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        # Claims to be a PNG, but the bytes say otherwise
        response = await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", b"%PDF-1.7", "image/png")})

        assert response.status_code == 422
        assert response.json()["detail"] == "The uploaded file is not a valid image."
        s3_client.upload_fileobj.assert_not_awaited()
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("not-image@example.com")
        assert found.profile.profile_picture_key is None

    async def test_oversized_file_returns_422(self, client: AsyncClient, s3_client, make_user, monkeypatch):
        user = await make_user(email="too-big@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))
        data = make_png()
        monkeypatch.setattr(settings, "profile_picture_max_bytes", len(data) - 1)

        response = await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", data, "image/png")})

        assert response.status_code == 422
        assert "or smaller" in response.json()["detail"]
        s3_client.upload_fileobj.assert_not_awaited()

    async def test_storage_failure_returns_502_and_does_not_persist(
        self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="s3-down@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))
        s3_client.upload_fileobj.side_effect = S3ClientException()

        response = await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", make_png(), "image/png")})

        assert response.status_code == 502
        assert response.json()["detail"] == "Failed to upload your profile picture. Please try again."
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("s3-down@example.com")
        assert found.profile.profile_picture_key is None


class TestDeleteCurrentUserProfilePicture:
    async def test_returns_200_clears_key_and_deletes_object(
        self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="remove@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))
        await client.put("/api/v1/profile/current/picture", files={"file": ("me.png", make_png(), "image/png")})
        uploaded_key = s3_client.upload_fileobj.await_args.args[0]

        response = await client.delete("/api/v1/profile/current/picture")

        assert response.status_code == 200
        assert response.json()["profile"]["profile_picture_url"] is None
        s3_client.delete_object_quietly.assert_awaited_once_with(uploaded_key)
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("remove@example.com")
        assert found.profile.profile_picture_key is None

    async def test_without_a_picture_returns_200(self, client: AsyncClient, s3_client, make_user):
        user = await make_user(email="nothing-to-remove@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/profile/current/picture")

        assert response.status_code == 200
        s3_client.delete_object_quietly.assert_not_awaited()

    async def test_missing_cookie_returns_401(self, client: AsyncClient, s3_client):
        response = await client.delete("/api/v1/profile/current/picture")
        assert response.status_code == 401
