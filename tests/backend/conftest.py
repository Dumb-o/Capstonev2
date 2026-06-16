import os
import time

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


class FakeRedis:
    def __init__(self):
        self._data: dict[str, tuple[str, float | None]] = _fake_redis_data

    async def get(self, key: str) -> str | None:
        if key in self._data:
            val, expiry = self._data[key]
            if expiry is None or time.time() < expiry:
                return val
            del self._data[key]
        return None

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self._data[key] = (value, time.time() + ttl)

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)

    async def incr(self, key: str) -> int:
        val, expiry = self._data.get(key, (0, None))
        val += 1
        self._data[key] = (val, expiry)
        return val

    async def expire(self, key: str, ttl: int) -> None:
        if key in self._data:
            val, _ = self._data[key]
            self._data[key] = (val, time.time() + ttl)

    async def ping(self) -> bool:
        return True


@pytest.fixture(scope="session", autouse=True)
def patch_redis():
    import app.redis_client as redis_mod
    import app.services.auth_service as auth_mod
    import app.middleware.rate_limit as rate_mod

    fake = FakeRedis()

    async def fake_init():
        return fake

    async def fake_get():
        return fake

    saved = {}
    originals = {
        redis_mod: ["init_redis", "get_redis"],
        auth_mod: ["get_redis"],
        rate_mod: ["get_redis"],
    }
    for mod, names in originals.items():
        for name in names:
            saved[(id(mod), name)] = getattr(mod, name)

    redis_mod.init_redis = fake_init
    redis_mod.get_redis = fake_get
    auth_mod.get_redis = fake_get
    rate_mod.get_redis = fake_get

    yield

    for mod, names in originals.items():
        for name in names:
            setattr(mod, name, saved[(id(mod), name)])


_fake_redis_data: dict[str, tuple[str, float | None]] = {}


@pytest.fixture(autouse=True)
def reset_fake_redis():
    _fake_redis_data.clear()


_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


async def _get_test_db():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(
        _engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.commit()


app.dependency_overrides[get_db] = _get_test_db


@pytest.fixture(autouse=True)
def restore_overrides():
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _get_test_db


@pytest.fixture
def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
async def db_session():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(
        _engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest.fixture
def sample_wallet() -> str:
    return "0x1234567890abcdef1234567890abcdef12345678"
