import pytest
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_admin
from app.models.models import (
    User, Job, Proposal, Contract, Message, Dispute,
    ContractStatus, DisputeStatus, UserRole,
)

_wallet_counter = itertools.count(600)

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


# ── Stats ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_stats(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = Job(id=_uniq_id("job"), client_id=client.id, title="Stats Job", budget=10.0, status="open")
    contract = Contract(id=_uniq_id("ct"), client_id=client.id, freelancer_id=freelancer.id,
                        title="Stats Contract", total_amount=100.0, status=ContractStatus.completed,
                        on_chain_id=1, contract_address="0xAddr")
    db_session.add_all([admin, client, freelancer, job, contract])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/stats",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_users"] == 3
    assert data["total_jobs"] == 1
    assert data["total_contracts"] == 1
    assert data["total_volume_eth"] == 100.0
    assert data["active_disputes"] == 0


# ── User CRUD ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_users(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    user = make_user(role=UserRole.freelancer, id=_uniq_id("user"))
    db_session.add_all([admin, user])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/users",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_admin_search_users(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"),
                      username="searchable_user", email="findme@test.com")
    db_session.add(admin)
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/users",
            params={"search": "searchable"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["username"] == "searchable_user" for u in data["users"])


@pytest.mark.asyncio
async def test_admin_create_user(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    db_session.add(admin)
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/users",
            json={
                "email": "newuser@test.com",
                "password": "testpass123",
                "username": "newuser",
                "role": "freelancer",
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@test.com"
    assert data["username"] == "newuser"
    assert data["role"] == "freelancer"


@pytest.mark.asyncio
async def test_admin_create_user_duplicate_email(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    existing = make_user(role=UserRole.freelancer, id=_uniq_id("existing"),
                         email="dup@test.com", auth_method="email")
    db_session.add_all([admin, existing])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/users",
            json={
                "email": "dup@test.com",
                "password": "testpass123",
                "username": "dupuser",
                "role": "freelancer",
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "already registered" in resp.text.lower()


@pytest.mark.asyncio
async def test_admin_update_user(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    target = make_user(role=UserRole.freelancer, id=_uniq_id("target"),
                       username="oldname")
    db_session.add_all([admin, target])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/admin/users/{target.id}",
            json={"username": "newname", "is_active": False},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["username"] == "newname"


@pytest.mark.asyncio
async def test_admin_delete_user(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    target = make_user(role=UserRole.freelancer, id=_uniq_id("target"))
    db_session.add_all([admin, target])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.delete(
            f"/api/admin/users/{target.id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


# ── Job CRUD ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_create_job(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    db_session.add_all([admin, client])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/jobs",
            json={
                "client_id": client.id,
                "title": "Admin Created Job",
                "budget": 50.0,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    assert resp.json()["title"] == "Admin Created Job"


@pytest.mark.asyncio
async def test_admin_list_jobs(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    job = Job(id=_uniq_id("job"), client_id=client.id, title="Admin List Test", budget=10.0, status="open")
    db_session.add_all([admin, client, job])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/jobs",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


@pytest.mark.asyncio
async def test_admin_delete_job(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    job = Job(id=_uniq_id("job"), client_id=client.id, title="To Delete", budget=10.0, status="open")
    db_session.add_all([admin, client, job])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.delete(
            f"/api/admin/jobs/{job.id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200


# ── Contract CRUD ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_contracts(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = Contract(id=_uniq_id("ct"), client_id=client.id, freelancer_id=freelancer.id,
                        title="Admin Contracts", total_amount=10.0, status=ContractStatus.active,
                        on_chain_id=1, contract_address="0xAddr")
    db_session.add_all([admin, client, freelancer, contract])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/contracts",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any(c["id"] == contract.id for c in data["contracts"])


@pytest.mark.asyncio
async def test_admin_delete_contract(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = Contract(id=_uniq_id("ct"), client_id=client.id, freelancer_id=freelancer.id,
                        title="To Delete", total_amount=10.0, status=ContractStatus.pending_signatures,
                        client_signed=False, freelancer_signed=False)
    db_session.add_all([admin, client, freelancer, contract])
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.delete(
            f"/api/admin/contracts/{contract.id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200


# ── Non-admin Access ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_non_admin_cannot_access_stats(db_session: AsyncSession):
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    db_session.add(freelancer)
    await db_session.flush()

    transport = _override(db_session, freelancer, is_admin=False)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/admin/stats",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_dispute_resolve_not_found(db_session: AsyncSession):
    admin = make_user(role=UserRole.admin, id=_uniq_id("admin"))
    db_session.add(admin)
    await db_session.flush()

    transport = _override(db_session, admin, is_admin=True)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/admin/disputes/nonexistent/resolve",
            json={"decision": "refund", "notes": "test"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 404
