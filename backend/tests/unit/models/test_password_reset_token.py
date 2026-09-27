from datetime import datetime, timedelta, timezone

from app.models.password_reset_token import PasswordResetToken


def make_token(
    created_at: datetime | None = None,
    used_at: datetime | None = None,
) -> PasswordResetToken:
    return PasswordResetToken(
        user_id=1,
        token_hash="a" * 64,
        created_at=created_at or datetime.now(timezone.utc),
        used_at=used_at,
    )


class TestIsUsed:
    def test_false_when_never_redeemed(self):
        assert make_token().is_used is False

    def test_true_once_redeemed(self):
        assert make_token(used_at=datetime.now(timezone.utc)).is_used is True


class TestIsValid:
    def test_freshly_created_token_is_valid(self):
        assert make_token().is_valid is True

    def test_valid_just_inside_the_window(self):
        created_at = datetime.now(timezone.utc) - timedelta(minutes=14)
        assert make_token(created_at=created_at).is_valid is True

    def test_invalid_once_past_the_window(self):
        created_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        assert make_token(created_at=created_at).is_valid is False

    def test_invalid_once_used_even_while_unexpired(self):
        # Single use matters more than the clock - a redeemed token must not
        # work again inside its 15 minutes.
        token = make_token(used_at=datetime.now(timezone.utc))
        assert token.is_valid is False

    def test_invalid_when_both_used_and_expired(self):
        token = make_token(
            created_at=datetime.now(timezone.utc) - timedelta(hours=2),
            used_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        assert token.is_valid is False
