from unittest.mock import AsyncMock, MagicMock

from app.db.base_class import Base


def make_mock_session(first_return: Base | None = None) -> MagicMock:
    """
    AsyncSession stand-in whose execute().scalars().first() resolves to
    `first_return`. Covers the single-row lookup shape used throughout
    the service layer (get_user_by_id/email/google_id and friends).

    session.add is a plain MagicMock (Session.add is sync even on
    AsyncSession); flush/commit/refresh/execute are AsyncMocks.

    Services flush rather than commit - the request-scoped transaction is
    committed by get_session - but commit and refresh are still stubbed for
    any caller that owns its own transaction.
    """
    result = MagicMock()
    result.scalars.return_value.first.return_value = first_return

    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session