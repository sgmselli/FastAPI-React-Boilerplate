import logging

from app.utils.logging import ExcludeHealthChecks


def access_record(path: str) -> logging.LogRecord:
    return logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("172.18.0.5:47290", "GET", path, "1.1", 200),
        exc_info=None,
    )


class TestExcludeHealthChecks:
    def test_drops_health_check_requests(self):
        assert ExcludeHealthChecks().filter(access_record("/api/v1/health")) is False

    def test_keeps_other_requests(self):
        assert ExcludeHealthChecks().filter(access_record("/api/v1/user/current")) is True

    def test_keeps_records_without_access_log_args(self):
        record = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "plain message", None, None)

        assert ExcludeHealthChecks().filter(record) is True
