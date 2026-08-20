from unittest.mock import AsyncMock, MagicMock

from app.db.base_class import Base


def make_mock_session(first_return: Base | None = None) -> MagicMock:
    """
    AsyncSession stand-in whose execute().scalars().first() resolves to
    `first_return`. Covers the single-row lookup shape used throughout
    the service layer (get_user_by_id/email/google_id and friends).

    session.add is a plain MagicMock (Session.add is sync even on
    AsyncSession); commit/refresh/execute are AsyncMocks.
    """
    result = MagicMock()
    result.scalars.return_value.first.return_value = first_return

    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session