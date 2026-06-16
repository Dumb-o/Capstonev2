import pytest
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Job, Proposal, Contract, ContractMilestone, UserRole

_wallet_counter = itertools.count(500)

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

def make_job(client_id, **kw):
    return Job(
        id=kw.pop("id", _uniq_id("job")),
        client_id=client_id,
        title=kw.pop("title", "Test Job"),
        description=kw.pop("description", "A test job"),
        budget=kw.pop("budget", 10.0),
        status=kw.pop("status", "open"),
    )


def _override(db_session, user):
    app.dependency_overrides.clear()
    async def override_get_db():
        yield db_session
    async def override_get_current_user():
        return user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return ASGITransport(app=app)


# ── Create Proposal ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_proposal_success(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "I can do this!", "bid_amount": 10.0, "estimated_days": 5},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    data = resp.json()
    assert data["bid_amount"] == 10.0
    assert data["status"] == "pending"
    assert data["job_id"] == job.id
    assert data["freelancer_id"] == freelancer.id


@pytest.mark.asyncio
async def test_create_proposal_self_job(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    job = make_job(client.id)
    db_session.add_all([client, job])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Myself", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "your own job" in resp.text.lower()


@pytest.mark.asyncio
async def test_create_proposal_duplicate(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    existing = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=freelancer.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, freelancer, job, existing])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Again", "bid_amount": 10.0, "estimated_days": 5},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "already proposed" in resp.text.lower()


@pytest.mark.asyncio
async def test_create_proposal_job_not_found(db_session: AsyncSession):
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    db_session.add(freelancer)
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/jobs/nonexistent_job/proposals",
            json={"cover_letter": "Hello", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 404


# ── List Proposals ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_proposals_authorized(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    proposal = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=freelancer.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, freelancer, job, proposal])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            f"/api/jobs/{job.id}/proposals",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == proposal.id


@pytest.mark.asyncio
async def test_list_proposals_unauthorized(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    stranger = make_user(role=UserRole.freelancer, id=_uniq_id("stranger"))
    job = make_job(client.id)
    db_session.add_all([client, stranger, job])
    await db_session.flush()

    transport = _override(db_session, stranger)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            f"/api/jobs/{job.id}/proposals",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_my_proposals_empty(db_session: AsyncSession):
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    db_session.add(freelancer)
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            "/api/proposals/mine",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == []


# ── Update Proposal (Accept/Reject) ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_accept_proposal_creates_contract(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    proposal = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=freelancer.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, freelancer, job, proposal])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/proposals/{proposal.id}",
            json={"status": "accepted"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "accepted"
    assert data["contract_id"] is not None


@pytest.mark.asyncio
async def test_reject_proposal(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    proposal = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=freelancer.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, freelancer, job, proposal])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/proposals/{proposal.id}",
            json={"status": "rejected"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_update_proposal_not_owner(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    stranger = make_user(role=UserRole.freelancer, id=_uniq_id("stranger"))
    job = make_job(client.id)
    proposal = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=stranger.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, stranger, job, proposal])
    await db_session.flush()

    transport = _override(db_session, stranger)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/proposals/{proposal.id}",
            json={"status": "accepted"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_proposal_invalid_status(db_session: AsyncSession):
    client = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    job = make_job(client.id)
    proposal = Proposal(
        id=_uniq_id("prop"),
        job_id=job.id,
        freelancer_id=freelancer.id,
        bid_amount=10.0,
        status="pending",
    )
    db_session.add_all([client, freelancer, job, proposal])
    await db_session.flush()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.put(
            f"/api/proposals/{proposal.id}",
            json={"status": "invalid_status"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
