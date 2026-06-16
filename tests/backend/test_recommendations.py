import itertools
import pytest
from unittest.mock import patch

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_admin
from app.models.models import User, UserRole
from app.schemas.schemas import RecommendedUserResponse

_wallet_counter = itertools.count(900)


def _uniq_wallet():
    return f"0x{next(_wallet_counter):040x}"


def _uniq_id(prefix="obj"):
    return f"{prefix}_{next(_wallet_counter)}"


def make_user(role=UserRole.freelancer, **kw):
    uid = kw.pop("id", _uniq_id(f"usr_{role.value}"))
    kw.setdefault("wallet_address", _uniq_wallet())
    return User(
        id=uid,
        username=kw.pop("username", f"{role.value}_tester"),
        role=role,
        is_active=True,
        **kw,
    )


def _override(db_session, user, is_admin=False):
    app.dependency_overrides.clear()
    async def override_get_db():
        yield db_session
    async def override_get_current_user():
        return user
    async def override_get_current_admin():
        return user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    if is_admin:
        app.dependency_overrides[get_current_admin] = override_get_current_admin
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_people_requires_client_role(db_session: AsyncSession):
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("fl"))
    db_session.add(freelancer)
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_people_self_exclusion(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"), skills=["React", "Solidity"], industries=["AI"])
    db_session.add(client)
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert not any(u["id"] == client.id for u in data)


@pytest.mark.asyncio
async def test_people_skill_scoring(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("skill_client"), skills=["React", "Solidity"])
    high = make_user(role=UserRole.freelancer, id=_uniq_id("high"), skills=["React", "Solidity"])
    low = make_user(role=UserRole.freelancer, id=_uniq_id("low"), skills=["React"])
    none_match = make_user(role=UserRole.freelancer, id=_uniq_id("none"), skills=["Python"])
    db_session.add_all([client, high, low, none_match])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    ids = [u["id"] for u in data]
    assert ids.index(high.id) < ids.index(low.id) < ids.index(none_match.id)


@pytest.mark.asyncio
async def test_people_industry_scoring(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("ind_client"), skills=[], industries=["AI", "FinTech"])
    ind_match = make_user(role=UserRole.freelancer, id=_uniq_id("ind_match"), skills=[], industries=["AI"])
    no_ind = make_user(role=UserRole.freelancer, id=_uniq_id("no_ind"), skills=[], industries=["Healthcare"])
    db_session.add_all([client, ind_match, no_ind])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    ids = [u["id"] for u in data]
    assert ids.index(ind_match.id) < ids.index(no_ind.id)


@pytest.mark.asyncio
async def test_people_experience_scoring(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("exp_client"), skills=[], experience_level="expert")
    same = make_user(role=UserRole.freelancer, id=_uniq_id("same"), skills=[], experience_level="expert")
    diff = make_user(role=UserRole.freelancer, id=_uniq_id("diff"), skills=[], experience_level="beginner")
    db_session.add_all([client, same, diff])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    ids = [u["id"] for u in data]
    assert ids.index(same.id) < ids.index(diff.id)


@pytest.mark.asyncio
async def test_people_availability_scoring(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("avail_client"), skills=[])
    avail = make_user(role=UserRole.freelancer, id=_uniq_id("avail"), skills=[], is_available=True)
    unavail = make_user(role=UserRole.freelancer, id=_uniq_id("unavail"), skills=[], is_available=False)
    db_session.add_all([client, avail, unavail])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    ids = [u["id"] for u in data]
    assert ids.index(avail.id) < ids.index(unavail.id)


@pytest.mark.asyncio
async def test_people_portfolio_scoring(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("port_client"), skills=[])
    with_port = make_user(role=UserRole.freelancer, id=_uniq_id("with"), skills=[], portfolio_cids=["Qm1"])
    without = make_user(role=UserRole.freelancer, id=_uniq_id("without"), skills=[], portfolio_cids=[])
    db_session.add_all([client, with_port, without])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    ids = [u["id"] for u in data]
    assert ids.index(with_port.id) < ids.index(without.id)


@pytest.mark.asyncio
async def test_people_response_schema(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("schema_client"), skills=[])
    target = make_user(
        role=UserRole.freelancer,
        id=_uniq_id("schema_target"),
        skills=["React"],
        headline="Frontend Dev",
    )
    db_session.add_all([client, target])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data
    for item in data:
        parsed = RecommendedUserResponse.model_validate(item)
        assert parsed.match_score >= 0
        assert hasattr(parsed, "industries")
        assert hasattr(parsed, "portfolio_cids")


@pytest.mark.asyncio
async def test_people_default_limit(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("def_client"), skills=[])
    users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"def_{i}"), skills=[]) for i in range(25)]
    db_session.add_all([client] + users)
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 10


@pytest.mark.asyncio
async def test_people_custom_limit(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("cust_client"), skills=[])
    users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"cust_{i}"), skills=[]) for i in range(25)]
    db_session.add_all([client] + users)
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 5},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 5


@pytest.mark.asyncio
async def test_people_max_limit_enforced(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("max_client"), skills=[])
    users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"max_{i}"), skills=[]) for i in range(60)]
    db_session.add_all([client] + users)
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            params={"limit": 60},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_people_empty_result_set(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("empty_client"), skills=[])
    db_session.add(client)
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/recommendations/people",
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == []
