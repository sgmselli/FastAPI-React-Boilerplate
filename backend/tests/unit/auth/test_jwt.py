from datetime import datetime, timezone

import pytest
from jose import JWTError, jwt as jose_jwt

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    store_access_token,
    store_refresh_token,
    delete_access_token,
    delete_refresh_token,
)
from app.core.config import settings


class TestAccessToken:
    def test_roundtrip(self):
        token = create_access_token({"sub": "42"})
        payload = decode_access_token(token)
        assert payload["sub"] == "42"

    def test_has_future_expiry_claim(self):
        token = create_access_token({"sub": "42"})
        payload = decode_access_token(token)
        assert payload["exp"] > datetime.now(timezone.utc).timestamp()

    def test_signed_with_access_secret(self):
        token = create_access_token({"sub": "42"})
        decoded = jose_jwt.decode(
            token, settings.access_secret_key, algorithms=[settings.jwt_encryption_algorithm]
        )
        assert decoded["sub"] == "42"

    def test_cannot_be_decoded_as_refresh_token(self):
        token = create_access_token({"sub": "42"})
        with pytest.raises(JWTError):
            decode_refresh_token(token)

    def test_tampered_token_rejected(self):
        token = create_access_token({"sub": "42"})
        with pytest.raises(JWTError):
            decode_access_token(token + "tampered")

    def test_garbage_token_rejected(self):
        with pytest.raises(JWTError):
            decode_access_token("not-a-jwt")


class TestRefreshToken:
    def test_roundtrip(self):
        token = create_refresh_token({"sub": "42", "jti": "abc"})
        payload = decode_refresh_token(token)
        assert payload["sub"] == "42"
        assert payload["jti"] == "abc"

    def test_cannot_be_decoded_as_access_token(self):
        token = create_refresh_token({"sub": "42"})
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_expiry_is_further_out_than_access_token(self):
        access_payload = decode_access_token(create_access_token({"sub": "1"}))
        refresh_payload = decode_refresh_token(create_refresh_token({"sub": "1"}))
        assert refresh_payload["exp"] > access_payload["exp"]


class FakeResponse:
    """Minimal stand-in for fastapi.Response - just records cookie calls."""

    def __init__(self):
        self.set_calls = []
        self.delete_calls = []

    def set_cookie(self, **kwargs):
        self.set_calls.append(kwargs)

    def delete_cookie(self, **kwargs):
        self.delete_calls.append(kwargs)


class TestCookies:
    def test_store_access_token_sets_httponly_cookie(self):
        response = FakeResponse()
        store_access_token(response, "some-token")
        call = response.set_calls[0]
        assert call["key"] == "access_token"
        assert call["value"] == "some-token"
        assert call["httponly"] is True
        assert call["max_age"] == 60 * settings.access_token_expire_minutes

    def test_store_refresh_token_sets_httponly_cookie(self):
        response = FakeResponse()
        store_refresh_token(response, "some-token")
        call = response.set_calls[0]
        assert call["key"] == "refresh_token"
        assert call["max_age"] == 60 * 60 * 24 * settings.refresh_token_expire_days

    def test_delete_access_token_clears_cookie(self):
        response = FakeResponse()
        delete_access_token(response)
        assert response.delete_calls[0]["key"] == "access_token"

    def test_delete_refresh_token_clears_cookie(self):
        response = FakeResponse()
        delete_refresh_token(response)
        assert response.delete_calls[0]["key"] == "refresh_token"