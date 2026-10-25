from app.core.config import settings
from app.utils.sentry import init_sentry

DSN = "https://public@o0.ingest.de.sentry.io/0"


class TestInitSentry:
    def test_does_nothing_without_a_dsn(self, monkeypatch, mocker):
        monkeypatch.setattr(settings, "sentry_dsn", None)
        init = mocker.patch("app.utils.sentry.sentry_sdk.init")

        init_sentry()

        init.assert_not_called()

    def test_does_nothing_with_an_empty_dsn(self, monkeypatch, mocker):
        monkeypatch.setattr(settings, "sentry_dsn", "")
        init = mocker.patch("app.utils.sentry.sentry_sdk.init")

        init_sentry()

        init.assert_not_called()

    def test_initialises_without_personal_data(self, monkeypatch, mocker):
        monkeypatch.setattr(settings, "sentry_dsn", DSN)
        init = mocker.patch("app.utils.sentry.sentry_sdk.init")
        mocker.patch("app.utils.sentry.ignore_logger_for_sentry_logs")

        init_sentry()

        kwargs = init.call_args.kwargs
        assert kwargs["dsn"] == DSN
        assert kwargs["environment"] == "test"
        assert kwargs["send_default_pii"] is False
        assert kwargs["include_local_variables"] is False
