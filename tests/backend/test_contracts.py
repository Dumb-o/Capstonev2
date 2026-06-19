import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import (
    User, Contract, ContractMilestone,
    ContractStatus, MilestoneStatus, UserRole,
)
from app.config import settings
from app.services import contract_service

_wallet_counter = itertools.count(300)

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

def make_contract(client_id: str, freelancer_id: str, **kw):
    return Contract(
        id=kw.pop("id", _uniq_id("ct")),
        client_id=client_id,
        freelancer_id=freelancer_id,
        title=kw.pop("title", "Test Contract"),
        total_amount=kw.pop("total_amount", 10.0),
        on_chain_id=kw.pop("on_chain_id", 1),
        contract_address=kw.pop("contract_address", "0xContractAddr"),
        status=kw.pop("status", ContractStatus.pending_funding),
        client_signed=kw.pop("client_signed", True),
        freelancer_signed=kw.pop("freelancer_signed", True),
    )


def make_milestone(contract_id, index=0, **kw):
    return ContractMilestone(
        id=kw.pop("id", f"ms_{contract_id}_{index}"),
        contract_id=contract_id,
        index=index,
        description=kw.pop("description", f"Milestone {index}"),
        amount=kw.pop("amount", 10.0),
        status=kw.pop("status", MilestoneStatus.pending),
    )


def _setup_override(db_session, user):
    app.dependency_overrides.clear()
    async def override_get_db():
        yield db_session
    async def override_get_current_user():
        return user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user


# ── Contract Create Validation ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_contract_milestone_sum_mismatch(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    db_session.add_all([client_user, freelancer_user])
    await db_session.flush()

    _setup_override(db_session, client_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/contracts/",
            json={
                "freelancer_id": freelancer_user.id,
                "title": "Bad Sum Contract",
                "total_amount": 100.0,
                "milestones": [
                    {"description": "MS1", "amount": 30.0},
                    {"description": "MS2", "amount": 30.0},
                ],
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "sum" in resp.text.lower()


@pytest.mark.asyncio
async def test_create_contract_no_private_key(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    db_session.add_all([client_user, freelancer_user])
    await db_session.flush()

    _setup_override(db_session, client_user)
    saved = settings.client_private_key
    settings.client_private_key = None

    mock_ipfs = AsyncMock(return_value={"cid": "QmTest123"})
    mock_create = AsyncMock(return_value={"on_chain_id": 99, "contract_address": "0xAddr"})

    transport = ASGITransport(app=app)
    with (
        patch("app.services.contract_service.ipfs_service.upload_file_bytes", mock_ipfs),
        patch("app.services.contract_service.create_contract_on_chain", mock_create),
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/contracts/",
                json={
                    "freelancer_id": freelancer_user.id,
                    "title": "No Key Contract",
                    "total_amount": 50.0,
                    "milestones": [{"description": "MS1", "amount": 50.0}],
                },
                headers={"Authorization": "Bearer fake-token"},
            )

    settings.client_private_key = saved
    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "private key" in resp.text.lower()


# ── Signing Edge Cases ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sign_contract_not_a_party(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    stranger = make_user(role=UserRole.freelancer, id=_uniq_id("stranger"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.pending_signatures,
                             client_signed=False, freelancer_signed=False)
    db_session.add_all([client_user, freelancer_user, stranger, contract])
    await db_session.flush()

    _setup_override(db_session, stranger)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_sign_contract_double_sign(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.pending_signatures,
                             client_signed=False, freelancer_signed=True)
    db_session.add_all([client_user, freelancer_user, contract])
    await db_session.flush()

    _setup_override(db_session, freelancer_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "already signed" in resp.text.lower()


# ── Funding Edge Cases ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fund_contract_not_client(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.pending_funding)
    db_session.add_all([client_user, freelancer_user, contract])
    await db_session.flush()

    _setup_override(db_session, freelancer_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/fund",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_fund_contract_wrong_status(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.active)
    db_session.add_all([client_user, freelancer_user, contract])
    await db_session.flush()

    _setup_override(db_session, client_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/fund",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400


# ── Milestone Edge Cases ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_milestone_not_freelancer(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.active)
    milestone = make_milestone(contract.id, 0)
    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    _setup_override(db_session, client_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/milestones/0/submit",
            json={"deliverable_cid": "QmTest", "notes": "test"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_submit_milestone_inactive_contract(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.pending_funding)
    milestone = make_milestone(contract.id, 0)
    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    _setup_override(db_session, freelancer_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/milestones/0/submit",
            json={"deliverable_cid": "QmTest", "notes": "test"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "not active" in resp.text.lower()


@pytest.mark.asyncio
async def test_approve_milestone_not_client(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.active)
    milestone = make_milestone(contract.id, 0, status=MilestoneStatus.submitted)
    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    _setup_override(db_session, freelancer_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/milestones/0/approve",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_approve_milestone_not_submitted(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.active)
    milestone = make_milestone(contract.id, 0, status=MilestoneStatus.pending)
    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    _setup_override(db_session, client_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/milestones/0/approve",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "not been submitted" in resp.text.lower()


@pytest.mark.asyncio
async def test_reject_milestone_submitted(db_session: AsyncSession):
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))
    contract = make_contract(client_user.id, freelancer_user.id,
                             status=ContractStatus.active)
    milestone = make_milestone(contract.id, 0, status=MilestoneStatus.submitted,
                               deliverable_cid="QmOriginal")
    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    _setup_override(db_session, client_user)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract.id}/milestones/0/reject",
            json={"reason": "Needs revision"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["deliverable_cid"] is None
