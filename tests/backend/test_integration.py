import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_admin
from app.models.models import (
    User, Job, Proposal, Contract, ContractMilestone, Dispute,
    ContractStatus, MilestoneStatus, DisputeStatus, UserRole,
)
from app.config import settings
from app.services import blockchain_service

_wallet_counter = itertools.count(200)


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


def make_job(client_id: str, **kw):
    return Job(
        id=kw.pop("id", _uniq_id("job")),
        client_id=client_id,
        title=kw.pop("title", "Integration Test Job"),
        description=kw.pop("description", "A job for integration testing"),
        budget=kw.pop("budget", 10.0),
        status=kw.pop("status", "open"),
    )


def make_proposal(job_id: str, freelancer_id: str, **kw):
    return Proposal(
        id=kw.pop("id", _uniq_id("prop")),
        job_id=job_id,
        freelancer_id=freelancer_id,
        cover_letter=kw.pop("cover_letter", "I can do this job"),
        bid_amount=kw.pop("bid_amount", 10.0),
        status=kw.pop("status", "pending"),
    )


# ── Integration Test: Full Contract Lifecycle ────────────────────────────────

@pytest.mark.asyncio
async def test_full_contract_lifecycle(db_session: AsyncSession):
    """
    Full lifecycle:
      1. Create a job (client)
      2. Submit a proposal (freelancer)
      3. Accept proposal (client) -> auto-creates contract
      4. Sign contract (freelancer)
      5. Sign contract (client)
      6. Fund contract (client)  -- mocks fund_contract_on_chain
      7. Submit milestone (freelancer) -- mocks submit_milestone_on_chain
      8. Approve milestone (client) -- mocks approve_milestone_on_chain
      9. Verify contract completed
    """
    client_user = make_user(role=UserRole.client, id=_uniq_id("client"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"))

    db_session.add_all([client_user, freelancer_user])
    await db_session.flush()

    app.dependency_overrides.clear()

    # ── 1. Create a job ──
    async def override_get_db():
        yield db_session

    async def as_client():
        return client_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = as_client

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/jobs/",
            json={
                "title": "Integration Test Job",
                "description": "Testing the full lifecycle",
                "budget": 10.0,
                "skills": ["Python", "Testing"],
                "duration_days": 14,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 201, resp.text
    job_data = resp.json()
    job_id = job_data["id"]
    assert job_data["title"] == "Integration Test Job"
    assert job_data["status"] == "open"

    # ── 2. Submit a proposal (freelancer) ──
    app.dependency_overrides[get_current_user] = lambda: freelancer_user

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/jobs/{job_id}/proposals",
            json={
                "cover_letter": "I am perfect for this job",
                "bid_amount": 10.0,
                "estimated_days": 10,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 201, resp.text
    proposal_data = resp.json()
    proposal_id = proposal_data["id"]
    assert proposal_data["bid_amount"] == 10.0
    assert proposal_data["status"] == "pending"

    # ── 3. Accept proposal (client) -> auto-creates contract ──
    app.dependency_overrides[get_current_user] = as_client

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.put(
            f"/api/proposals/{proposal_id}",
            json={"status": "accepted"},
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    accepted = resp.json()
    assert accepted["status"] == "accepted"
    assert accepted["contract_id"] is not None
    contract_id = accepted["contract_id"]

    # Verify contract was auto-created
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/contracts/{contract_id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    contract = resp.json()["contract"]
    assert contract["status"] == "pending_signatures"
    assert contract["client_signed"] is False
    assert contract["freelancer_signed"] is False
    assert contract["total_amount"] == 10.0

    # Seed on-chain IDs for the contract (normally done by create_contract)
    # Since proposal acceptance creates contracts off-chain, we set these manually
    contract_obj = await db_session.get(Contract, contract_id)
    contract_obj.on_chain_id = 1
    contract_obj.contract_address = "0xMockContractAddress"
    await db_session.flush()

    # ── 4. Sign contract (freelancer) ──
    app.dependency_overrides[get_current_user] = lambda: freelancer_user

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract_id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["freelancer_signed"] is True
    assert resp.json()["client_signed"] is False
    assert resp.json()["status"] == "pending_signatures"

    # ── 5. Sign contract (client) ──
    app.dependency_overrides[get_current_user] = as_client

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract_id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["client_signed"] is True
    assert resp.json()["status"] == "pending_funding"

    # ── 6. Fund contract (client) ──
    settings.client_private_key = "0xTestKey"

    mock_fund = AsyncMock(return_value="0xFundTxHash")
    with patch("app.services.contract_service.fund_contract_on_chain", mock_fund):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract_id}/fund",
                headers={"Authorization": "Bearer fake-token"},
            )

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "active"
    mock_fund.assert_awaited_once()

    # ── 7. Submit milestone (freelancer) ──
    app.dependency_overrides[get_current_user] = lambda: freelancer_user

    mock_submit = AsyncMock(return_value="0xSubmitTxHash")
    with patch("app.services.contract_service.submit_milestone_on_chain", mock_submit):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract_id}/milestones/0/submit",
                json={
                    "deliverable_cid": "QmIntegrationTest",
                    "notes": "Delivered the complete work",
                },
                headers={"Authorization": "Bearer fake-token"},
            )

    assert resp.status_code == 200, resp.text
    ms_data = resp.json()
    assert ms_data["deliverable_cid"] == "QmIntegrationTest"
    assert ms_data["status"] == "submitted"
    mock_submit.assert_awaited_once()

    # ── 8. Approve milestone (client) ──
    app.dependency_overrides[get_current_user] = as_client

    mock_approve = AsyncMock(return_value="0xApproveTxHash")
    with patch("app.services.contract_service.approve_milestone_on_chain", mock_approve):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract_id}/milestones/0/approve",
                headers={"Authorization": "Bearer fake-token"},
            )

    assert resp.status_code == 200, resp.text
    approve_data = resp.json()
    assert approve_data["status"] == "approved"

    # ── 9. Verify contract completed ──
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/contracts/{contract_id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["contract"]["status"] == "completed"

    app.dependency_overrides.clear()


# ── Integration Test: Dispute Lifecycle ──────────────────────────────────────

@pytest.mark.asyncio
async def test_dispute_lifecycle(db_session: AsyncSession):
    """
    Dispute lifecycle:
      1. Create a job (client)
      2. Create a proposal (freelancer)
      3. Accept proposal -> contract auto-created
      4. Both sign -> pending_funding
      5. Fund contract -> active (mock blockchain)
      6. Raise a dispute (client)
      7. Verify contract status changed to disputed
      8. Admin resolves with refund
      9. Verify contract cancelled
    """
    client_user = make_user(role=UserRole.client, id=_uniq_id("client_disp"))
    freelancer_user = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer_disp"))
    admin_user = make_user(role=UserRole.admin, id=_uniq_id("admin_disp"))

    db_session.add_all([client_user, freelancer_user, admin_user])
    await db_session.flush()

    app.dependency_overrides.clear()

    async def override_get_db():
        yield db_session

    async def as_client():
        return client_user

    async def as_admin():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db

    # ── 1. Create a job (client) ──
    app.dependency_overrides[get_current_user] = as_client
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/jobs/",
            json={
                "title": "Dispute Test Job",
                "description": "Testing dispute resolution",
                "budget": 5.0,
                "skills": ["Testing"],
                "duration_days": 7,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 201, resp.text
    job_id = resp.json()["id"]

    # ── 2. Create a proposal (freelancer) ──
    app.dependency_overrides[get_current_user] = lambda: freelancer_user

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/jobs/{job_id}/proposals",
            json={
                "cover_letter": "I can do this",
                "bid_amount": 5.0,
                "estimated_days": 5,
            },
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 201, resp.text
    proposal_id = resp.json()["id"]

    # ── 3. Accept proposal -> contract auto-created ──
    app.dependency_overrides[get_current_user] = as_client

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.put(
            f"/api/proposals/{proposal_id}",
            json={"status": "accepted"},
            headers={"Authorization": "Bearer fake-token"},
        )

    assert resp.status_code == 200, resp.text
    contract_id = resp.json()["contract_id"]

    # Seed on-chain IDs
    contract_obj = await db_session.get(Contract, contract_id)
    contract_obj.on_chain_id = 2
    contract_obj.contract_address = "0xMockContractAddress"
    await db_session.flush()

    # ── 4. Both sign -> pending_funding ──
    app.dependency_overrides[get_current_user] = lambda: freelancer_user
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract_id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200

    app.dependency_overrides[get_current_user] = as_client
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/contracts/{contract_id}/sign",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending_funding"

    # ── 5. Fund contract -> active ──
    settings.client_private_key = "0xTestKey"
    mock_fund = AsyncMock(return_value="0xFundTxHash")
    with patch("app.services.contract_service.fund_contract_on_chain", mock_fund):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract_id}/fund",
                headers={"Authorization": "Bearer fake-token"},
            )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # ── 6. Raise a dispute (client) ──
    settings.client_private_key = "0xTestKey"
    mock_raise = AsyncMock(return_value="0xDisputeTxHash")
    with patch("app.routers.disputes.raise_dispute_on_chain", mock_raise):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract_id}/disputes",
                json={"raised_by": "client", "reason": "Work quality is unacceptable"},
                headers={"Authorization": "Bearer fake-token"},
            )

    assert resp.status_code == 201, resp.text
    dispute_data = resp.json()
    dispute_id = dispute_data["id"]
    assert dispute_data["status"] == "open"
    assert dispute_data["reason"] == "Work quality is unacceptable"
    mock_raise.assert_awaited_once()

    # ── 7. Verify contract status changed to disputed ──
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/contracts/{contract_id}",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert resp.json()["contract"]["status"] == "disputed"

    # ── 8. Admin resolves with refund ──
    app.dependency_overrides[get_current_admin] = as_admin
    app.dependency_overrides[get_current_user] = as_admin

    mock_resolve = AsyncMock(return_value="0xResolveTxHash")
    with patch("app.routers.admin.resolve_dispute_on_chain", mock_resolve):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/admin/disputes/{dispute_id}/resolve",
                json={"decision": "refund", "notes": "Refunding due to poor quality"},
                headers={"Authorization": "Bearer fake-token"},
            )

    assert resp.status_code == 200, resp.text
    resolve_data = resp.json()
    assert resolve_data["status"] == "resolved"
    assert resolve_data["decision"] == "refund"
    mock_resolve.assert_awaited_once()

    # ── 9. Verify contract cancelled (as client, since admin is not a party) ──
    app.dependency_overrides[get_current_user] = as_client
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/contracts/{contract_id}",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert resp.json()["contract"]["status"] == "cancelled"
