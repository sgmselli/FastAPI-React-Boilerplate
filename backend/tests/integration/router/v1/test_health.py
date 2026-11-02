import asyncio

from httpx import AsyncClient

from app.utils import health


async def _fail(*args):
    raise ConnectionError("unreachable")


async def _hang(*args):
    await asyncio.sleep(10)


class TestHealth:
    async def test_returns_200_when_database_and_redis_are_up(self, client: AsyncClient):
        response = await client.get("/api/v1/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_returns_503_when_database_is_down(self, client: AsyncClient, monkeypatch):
        monkeypatch.setattr(health, "check_database", _fail)

        response = await client.get("/api/v1/health")

        assert response.status_code == 503
        assert response.json() == {"status": "error", "database": "unavailable", "redis": "ok"}

    async def test_returns_503_when_redis_is_down(self, client: AsyncClient, monkeypatch):
        monkeypatch.setattr(health, "check_redis", _fail)

        response = await client.get("/api/v1/health")

        assert response.status_code == 503
        assert response.json() == {"status": "error", "database": "ok", "redis": "unavailable"}

    async def test_returns_503_when_a_check_hangs(self, client: AsyncClient, monkeypatch):
        monkeypatch.setattr(health, "CHECK_TIMEOUT_SECONDS", 0.1)
        monkeypatch.setattr(health, "check_database", _hang)

        response = await client.get("/api/v1/health")

        assert response.status_code == 503
        assert response.json()["database"] == "unavailable"
