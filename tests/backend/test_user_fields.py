import pytest
import itertools
from datetime import datetime, timezone
from unittest.mock import patch

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_admin
from app.models.models import User, UserRole
from app.schemas.schemas import UserResponse

_wallet_counter = itertools.count(800)

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


# ── Default values on registration ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_email_register_default_fields(client: AsyncClient):
    resp = await client.post(
        "/api/auth/email/register",
        json={
            "email": "freelancer@example.com",
            "password": "strongpass123",
            "username": "freelancer",
            "role": "freelancer",
        },
    )
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert user["headline"] is None
    assert user["experience_level"] == "mid"
    assert user["industries"] == []
    assert user["is_available"] is True
    assert user["portfolio_cids"] == []


@pytest.mark.asyncio
async def test_wallet_register_default_fields(client: AsyncClient):
    resp = await client.post(
        "/api/auth/challenge",
        json={"address": "0x1111111111111111111111111111111111111111"},
    )
    assert resp.status_code == 200
    nonce = resp.json()["nonce"]

    wallet = "0x1111111111111111111111111111111111111111"
    with patch("app.routers.auth.verify_signature", return_value=True):
        resp = await client.post(
            "/api/auth/login",
            json={"address": wallet, "signature": "0xsig", "role": "freelancer"},
        )
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert user["headline"] is None
    assert user["experience_level"] == "mid"
    assert user["industries"] == []
    assert user["is_available"] is True
    assert user["portfolio_cids"] == []


# ── Profile update setting new fields ────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_profile_new_fields(client: AsyncClient):
    resp = await client.post(
        "/api/auth/email/register",
        json={
            "email": "updatable@example.com",
            "password": "strongpass123",
            "username": "updatable",
            "role": "freelancer",
        },
    )
    token = resp.json()["access_token"]

    resp = await client.put(
        "/api/users/me",
        json={
            "headline": "Full Stack Developer",
            "experience_level": "senior",
            "industries": ["FinTech", "AI"],
            "is_available": False,
            "portfolio_cids": ["QmTest123", "QmTest456"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    user = resp.json()
    assert user["headline"] == "Full Stack Developer"
    assert user["experience_level"] == "senior"
    assert user["industries"] == ["FinTech", "AI"]
    assert user["is_available"] is False
    assert user["portfolio_cids"] == ["QmTest123", "QmTest456"]


@pytest.mark.asyncio
async def test_update_profile_partial_fields(client: AsyncClient):
    resp = await client.post(
        "/api/auth/email/register",
        json={
            "email": "partial@example.com",
            "password": "strongpass123",
            "username": "partial",
            "role": "freelancer",
        },
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    resp = await client.put(
        "/api/users/me",
        json={"headline": "Just Headline"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    user = resp.json()
    assert user["headline"] == "Just Headline"
    assert user["experience_level"] == "mid"
    assert user["industries"] == []
    assert user["is_available"] is True
    assert user["portfolio_cids"] == []


# ── UserResponse serialization ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_response_serialization():
    now = datetime.now(timezone.utc)
    user = make_user(
        id=_uniq_id("serial"),
        auth_method="wallet",
        skills=["Solidity"],
        hourly_rate=50.0,
        rating=4.5,
        created_at=now,
        headline="Smart Contract Dev",
        experience_level="expert",
        industries=["Blockchain", "DeFi"],
        is_available=True,
        portfolio_cids=["QmPortfolio1"],
    )
    response = UserResponse.model_validate(user)
    assert response.headline == "Smart Contract Dev"
    assert response.experience_level == "expert"
    assert response.industries == ["Blockchain", "DeFi"]
    assert response.is_available is True
    assert response.portfolio_cids == ["QmPortfolio1"]


@pytest.mark.asyncio
async def test_user_response_null_fields():
    now = datetime.now(timezone.utc)
    user = make_user(
        id=_uniq_id("nullfields"),
        auth_method="wallet",
        skills=[],
        hourly_rate=0.0,
        rating=0.0,
        created_at=now,
        headline=None,
        experience_level="mid",
        industries=[],
        is_available=True,
        portfolio_cids=[],
    )
    response = UserResponse.model_validate(user)
    assert response.headline is None
    assert response.industries == []
    assert response.portfolio_cids == []


# ── Admin user creation with new fields ──────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_create_user_with_new_fields(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    db_session.add(admin)
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/users",
            json={
                "email": "admincreated@test.com",
                "password": "testpass123",
                "username": "admincreated",
                "role": "freelancer",
                "headline": "Admin Created Dev",
                "experience_level": "advanced",
                "industries": ["Healthcare", "Education"],
                "is_available": False,
                "portfolio_cids": ["QmAdminCid"],
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    data = resp.json()
    assert data["headline"] == "Admin Created Dev"
    assert data["experience_level"] == "advanced"
    assert data["industries"] == ["Healthcare", "Education"]
    assert data["is_available"] is False
    assert data["portfolio_cids"] == ["QmAdminCid"]


@pytest.mark.asyncio
async def test_admin_create_user_defaults(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin_defaults"))
    db_session.add(admin)
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/users",
            json={
                "email": "adminbasic@test.com",
                "password": "testpass123",
                "username": "adminbasic",
                "role": "freelancer",
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    data = resp.json()
    assert data["headline"] is None
    assert data["experience_level"] == "mid"
    assert data["industries"] == []
    assert data["is_available"] is True
    assert data["portfolio_cids"] == []


# ── List users filter by new fields ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_filter_experience_level(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("searcher"), headline="Searcher")
    expert = make_user(role=UserRole.freelancer, id=_uniq_id("expert"), experience_level="expert")
    junior = make_user(role=UserRole.freelancer, id=_uniq_id("junior"), experience_level="junior")
    db_session.add_all([current_user, expert, junior])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"experience_level": "expert"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == expert.id for u in data["users"])
    assert not any(u["id"] == junior.id for u in data["users"])


@pytest.mark.asyncio
async def test_list_users_filter_availability(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("avail_searcher"), headline="Avail Searcher")
    available = make_user(role=UserRole.freelancer, id=_uniq_id("avail"), is_available=True)
    unavailable = make_user(role=UserRole.freelancer, id=_uniq_id("unavail"), is_available=False)
    db_session.add_all([current_user, available, unavailable])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"is_available": True},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == available.id for u in data["users"])
    assert not any(u["id"] == unavailable.id for u in data["users"])


@pytest.mark.asyncio
async def test_list_users_search_headline(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("hl_searcher"))
    matching = make_user(role=UserRole.freelancer, id=_uniq_id("hl_match"), headline="AI Engineer")
    non_matching = make_user(role=UserRole.freelancer, id=_uniq_id("hl_no"), headline="Designer")
    db_session.add_all([current_user, matching, non_matching])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"search": "AI Engineer"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == matching.id for u in data["users"])
    assert not any(u["id"] == non_matching.id for u in data["users"])


# ── Admin update user with new fields ────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_update_user_new_fields(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin_upd"))
    target = make_user(role=UserRole.freelancer, id=_uniq_id("target"))
    db_session.add_all([admin, target])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/admin/users/{target.id}",
            json={
                "headline": "Updated Headline",
                "experience_level": "lead",
                "industries": ["AI", "Blockchain"],
                "is_available": False,
                "portfolio_cids": ["QmUpdated"],
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["headline"] == "Updated Headline"
    assert data["experience_level"] == "lead"
    assert data["industries"] == ["AI", "Blockchain"]
    assert data["is_available"] is False
    assert data["portfolio_cids"] == ["QmUpdated"]


# ── Industry filter ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_filter_industry(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("ind_searcher"), headline="Ind Searcher")
    fintech = make_user(role=UserRole.freelancer, id=_uniq_id("fintech"), industries=["FinTech", "AI"])
    healthcare = make_user(role=UserRole.freelancer, id=_uniq_id("health"), industries=["Healthcare"])
    db_session.add_all([current_user, fintech, healthcare])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"industry": "FinTech"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == fintech.id for u in data["users"])
    assert not any(u["id"] == healthcare.id for u in data["users"])


@pytest.mark.asyncio
async def test_list_users_filter_industry_case_insensitive(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("ind_case"), headline="Case")
    ai_dev = make_user(role=UserRole.freelancer, id=_uniq_id("aidev"), industries=["Artificial Intelligence"])
    db_session.add_all([current_user, ai_dev])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"industry": "artificial intelligence"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == ai_dev.id for u in data["users"])


# ── Experience level validation ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_invalid_experience_level(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("invalid_exp"), headline="Invalid Exp")
    db_session.add(current_user)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"experience_level": "nonexistent"},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_users_valid_experience_levels(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("exp_validator"), headline="Validator")
    beginner = make_user(role=UserRole.freelancer, id=_uniq_id("beginner"), experience_level="beginner")
    intermediate = make_user(role=UserRole.freelancer, id=_uniq_id("intermediate"), experience_level="intermediate")
    advanced = make_user(role=UserRole.freelancer, id=_uniq_id("advanced"), experience_level="advanced")
    expert = make_user(role=UserRole.freelancer, id=_uniq_id("expert"), experience_level="expert")
    db_session.add_all([current_user, beginner, intermediate, advanced, expert])
    await db_session.flush()

    for level, expected_id in [("beginner", beginner.id), ("intermediate", intermediate.id),
                                ("advanced", advanced.id), ("expert", expert.id)]:
        transport = _override(db_session, current_user)
        async with AsyncClient(transport=transport, base_url="http://test") as httpx:
            resp = await httpx.get(
                "/api/users/",
                params={"experience_level": level},
                headers={"Authorization": "Bearer fake-token"},
            )
        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert any(u["id"] == expected_id for u in data["users"]), f"Expected {level} to match {expected_id}"


# ── Page_size alias ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_page_size_alias(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("ps_user"), headline="PS User")
    users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"ps_f_{i}"), headline=f"Freelancer {i}")
             for i in range(5)]
    db_session.add_all([current_user] + users)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"page_size": 2},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 2
    assert data["total"] >= 5
    assert data["page"] == 1
    assert data["pages"] >= 3


# ── Combined filters ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_combined_filters(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("comb_searcher"), headline="Comb Searcher")
    match = make_user(
        role=UserRole.freelancer, id=_uniq_id("match"),
        headline="AI Engineer", skills=["Python", "TensorFlow"],
        experience_level="expert", industries=["AI"], is_available=True,
        hourly_rate=80.0,
    )
    wrong_exp = make_user(
        role=UserRole.freelancer, id=_uniq_id("wrong_exp"),
        headline="AI Engineer", skills=["Python"],
        experience_level="junior", industries=["AI"], is_available=True,
    )
    wrong_industry = make_user(
        role=UserRole.freelancer, id=_uniq_id("wrong_ind"),
        headline="Data Analyst", skills=["Python"],
        experience_level="expert", industries=["Finance"], is_available=True,
    )
    unavailable = make_user(
        role=UserRole.freelancer, id=_uniq_id("unavail"),
        headline="AI Engineer", skills=["Python"],
        experience_level="expert", industries=["AI"], is_available=False,
    )
    db_session.add_all([current_user, match, wrong_exp, wrong_industry, unavailable])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={
                "search": "AI Engineer",
                "experience_level": "expert",
                "industry": "AI",
                "is_available": True,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == match.id for u in data["users"])
    assert not any(u["id"] == wrong_exp.id for u in data["users"])
    assert not any(u["id"] == wrong_industry.id for u in data["users"])
    assert not any(u["id"] == unavailable.id for u in data["users"])


# ── Pagination ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_pagination_defaults(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("page_def"), headline="Page Def")
    many_users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"pd_{i}"), headline=f"User {i}")
                  for i in range(25)]
    db_session.add_all([current_user] + many_users)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 20
    assert data["page"] == 1
    assert data["pages"] == 2


@pytest.mark.asyncio
async def test_list_users_pagination_page_2(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("p2_user"), headline="P2 User")
    many_users = [make_user(role=UserRole.freelancer, id=_uniq_id(f"p2_{i}"), headline=f"U {i}")
                  for i in range(25)]
    db_session.add_all([current_user] + many_users)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"page": 2},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 5
    assert data["page"] == 2


@pytest.mark.asyncio
async def test_list_users_invalid_page(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("invalid_page"), headline="Invalid Page")
    db_session.add(current_user)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"page": 0},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_users_invalid_page_size(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("invalid_ps"), headline="Invalid PS")
    db_session.add(current_user)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"page_size": 0},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 422


# ── Search ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_search_empty(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("empty_search"), headline="Empty Search")
    db_session.add(current_user)
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"search": "zzz_nonexistent_zzz"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 0
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_users_search_no_results(client: AsyncClient):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get("/api/users/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_users_search_skills(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("skill_search"), headline="Skill Search")
    python_dev = make_user(role=UserRole.freelancer, id=_uniq_id("py"), skills=["Python", "Django"])
    java_dev = make_user(role=UserRole.freelancer, id=_uniq_id("java"), skills=["Java", "Spring"])
    db_session.add_all([current_user, python_dev, java_dev])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"skills": "Python"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == python_dev.id for u in data["users"])
    assert not any(u["id"] == java_dev.id for u in data["users"])


# ── Skills with multiple values ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_filter_skills_multiple(db_session: AsyncSession):
    current_user = make_user(role=UserRole.client, id=_uniq_id("multi_skill"), headline="Multi Skill")
    fullstack = make_user(role=UserRole.freelancer, id=_uniq_id("fs"), skills=["React", "Python", "Solidity"])
    react_only = make_user(role=UserRole.freelancer, id=_uniq_id("react"), skills=["React"])
    python_only = make_user(role=UserRole.freelancer, id=_uniq_id("py_only"), skills=["Python"])
    db_session.add_all([current_user, fullstack, react_only, python_only])
    await db_session.flush()

    transport = _override(db_session, current_user)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/users/",
            params={"skills": "React,Python"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["id"] == fullstack.id for u in data["users"])
    assert any(u["id"] == react_only.id for u in data["users"])
    assert any(u["id"] == python_only.id for u in data["users"])
