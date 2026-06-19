import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport
from fastapi import Depends

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_admin
from app.models.models import (
    User, Contract, ContractMilestone, Dispute,
    ContractStatus, MilestoneStatus, DisputeStatus, DisputeDecision, UserRole,
)
from app.config import settings
from app.services import blockchain_service


_wallet_counter = itertools.count(100)


def _uniq_wallet():
    return f"0x{next(_wallet_counter):040x}"


def make_user(role=UserRole.freelancer, **kw):
    uid = kw.pop("id", f"usr_{role.value}_{next(_wallet_counter)}")
    kw.setdefault("wallet_address", _uniq_wallet())
    return User(
        id=uid,
        username=kw.pop("username", f"{role.value}_tester"),
        role=role,
        is_active=True,
        **kw,
    )


def make_contract(client_id: str, freelancer_id: str, on_chain_id: int = 42,
                  status=ContractStatus.active):
    return Contract(
        id=f"ct_test_{next(_wallet_counter)}",
        client_id=client_id,
        freelancer_id=freelancer_id,
        title="Test Contract",
        total_amount=10.0,
        on_chain_id=on_chain_id,
        contract_address="0xContractAddress",
        status=status,
        client_signed=True,
        freelancer_signed=True,
    )


def make_milestone(contract_id: str, index: int = 0, status=MilestoneStatus.pending):
    return ContractMilestone(
        id=f"ms_{contract_id}_{index}",
        contract_id=contract_id,
        index=index,
        description=f"Milestone {index}",
        amount=5.0,
        status=status,
    )


# ── Unit tests: blockchain_service (raw functions, web3 mocked) ─────────────

@pytest.mark.asyncio
async def test_blockchain_submit_milestone_on_chain():
    """P0.2: submit_milestone_on_chain calls contract.submitMilestone with correct args."""
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 1
    mock_w3.eth.gas_price = 20000000000
    mock_w3.eth.send_raw_transaction.return_value = b"\x01"
    mock_w3.eth.wait_for_transaction_receipt.return_value = MagicMock()

    mock_contract = MagicMock()
    mock_contract.functions.submitMilestone.return_value.build_transaction.return_value = {
        "from": "0xTest", "nonce": 1, "gas": 200000, "gasPrice": 20000000000,
    }

    mock_account = MagicMock()
    mock_account.address = "0xFreelancer"
    mock_account.sign_transaction.return_value = MagicMock(raw_transaction=b"\x02")
    mock_w3.eth.account.from_key.return_value = mock_account

    with (
        patch.object(blockchain_service, "get_web3", return_value=mock_w3),
        patch.object(blockchain_service, "get_contract", return_value=mock_contract),
    ):
        tx_hash = await blockchain_service.submit_milestone_on_chain(
            contract_id=42,
            milestone_index=0,
            deliverable_cid="QmTest123",
            freelancer_private_key="0xPrivKey",
        )

    mock_contract.functions.submitMilestone.assert_called_once_with(42, 0, "QmTest123")
    mock_w3.eth.account.from_key.assert_called_once_with("0xPrivKey")
    assert tx_hash == "01"


@pytest.mark.asyncio
async def test_blockchain_raise_dispute_on_chain():
    """P0.3: raise_dispute_on_chain calls contract.raiseDispute."""
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 1
    mock_w3.eth.gas_price = 20000000000
    mock_w3.eth.send_raw_transaction.return_value = b"\x03"
    mock_w3.eth.wait_for_transaction_receipt.return_value = MagicMock()

    mock_contract = MagicMock()
    mock_contract.functions.raiseDispute.return_value.build_transaction.return_value = {
        "from": "0xTest", "nonce": 1, "gas": 200000, "gasPrice": 20000000000,
    }

    mock_account = MagicMock()
    mock_account.sign_transaction.return_value = MagicMock(raw_transaction=b"\x04")
    mock_w3.eth.account.from_key.return_value = mock_account

    with (
        patch.object(blockchain_service, "get_web3", return_value=mock_w3),
        patch.object(blockchain_service, "get_contract", return_value=mock_contract),
    ):
        tx_hash = await blockchain_service.raise_dispute_on_chain(
            contract_id=42,
            initiator_private_key="0xPrivKey",
        )

    mock_contract.functions.raiseDispute.assert_called_once_with(42)
    assert tx_hash == "03"


@pytest.mark.asyncio
async def test_blockchain_resolve_dispute_on_chain_refund():
    """P0.3: resolve_dispute_on_chain with decision='refund' calls refundDispute."""
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 1
    mock_w3.eth.gas_price = 20000000000
    mock_w3.eth.send_raw_transaction.return_value = b"\x05"
    mock_w3.eth.wait_for_transaction_receipt.return_value = MagicMock()

    mock_contract = MagicMock()
    mock_refund_fn = MagicMock()
    mock_refund_fn.build_transaction.return_value = {
        "from": "0xAdmin", "nonce": 1, "gas": 200000, "gasPrice": 20000000000,
    }
    mock_contract.functions.refundDispute.return_value = mock_refund_fn

    mock_account = MagicMock()
    mock_account.sign_transaction.return_value = MagicMock(raw_transaction=b"\x06")
    mock_w3.eth.account.from_key.return_value = mock_account

    with (
        patch.object(blockchain_service, "get_web3", return_value=mock_w3),
        patch.object(blockchain_service, "get_contract", return_value=mock_contract),
    ):
        tx_hash = await blockchain_service.resolve_dispute_on_chain(
            contract_id=42,
            decision="refund",
            admin_private_key="0xAdminKey",
        )

    mock_contract.functions.refundDispute.assert_called_once_with(42)
    mock_contract.functions.releasePayment.assert_not_called()
    assert tx_hash == "05"


@pytest.mark.asyncio
async def test_blockchain_resolve_dispute_on_chain_release():
    """P0.3: resolve_dispute_on_chain with decision='release' calls releasePayment."""
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 1
    mock_w3.eth.gas_price = 20000000000
    mock_w3.eth.send_raw_transaction.return_value = b"\x07"
    mock_w3.eth.wait_for_transaction_receipt.return_value = MagicMock()

    mock_contract = MagicMock()
    mock_release_fn = MagicMock()
    mock_release_fn.build_transaction.return_value = {
        "from": "0xAdmin", "nonce": 1, "gas": 200000, "gasPrice": 20000000000,
    }
    mock_contract.functions.releasePayment.return_value = mock_release_fn

    mock_account = MagicMock()
    mock_account.sign_transaction.return_value = MagicMock(raw_transaction=b"\x08")
    mock_w3.eth.account.from_key.return_value = mock_account

    with (
        patch.object(blockchain_service, "get_web3", return_value=mock_w3),
        patch.object(blockchain_service, "get_contract", return_value=mock_contract),
    ):
        tx_hash = await blockchain_service.resolve_dispute_on_chain(
            contract_id=42,
            decision="release",
            admin_private_key="0xAdminKey",
        )

    mock_contract.functions.releasePayment.assert_called_once_with(42)
    mock_contract.functions.refundDispute.assert_not_called()
    assert tx_hash == "07"


def test_blockchain_helpers():
    """Unit tests for pure helper functions."""
    assert blockchain_service.to_wei(1.0) == 1000000000000000000
    assert blockchain_service.from_wei(1000000000000000000) == 1.0
    assert blockchain_service.calculate_fee(10000, 250) == 250
    assert blockchain_service.calculate_fee(10000) == 250


# ── Integration tests: router endpoints (blockchain mocked, real DB + auth) ──

@pytest.mark.asyncio
async def test_submit_milestone_triggers_on_chain(db_session: AsyncSession):
    """
    P0.2: POST /api/contracts/{id}/milestones/{index}/submit
    calls submit_milestone_on_chain with correct args.
    """
    client_user = make_user(role=UserRole.client, id="usr_client_submit")
    freelancer_user = make_user(role=UserRole.freelancer, id="usr_freelancer_submit")
    contract = make_contract(client_user.id, freelancer_user.id)
    milestone = make_milestone(contract.id, index=0, status=MilestoneStatus.pending)

    db_session.add_all([client_user, freelancer_user, contract, milestone])
    await db_session.flush()

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return freelancer_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    settings.client_private_key = "0xTestClientKey"
    settings.freelancer_private_key = "0xTestFreelancerKey"

    mock_on_chain = AsyncMock(return_value="0xMockTxHash")

    with patch("app.services.contract_service.submit_milestone_on_chain", mock_on_chain):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract.id}/milestones/0/submit",
                json={"deliverable_cid": "QmTestOnChain", "notes": "testing on-chain"},
                headers={"Authorization": "Bearer fake-token"},
            )

    app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["deliverable_cid"] == "QmTestOnChain"
    assert data["status"] == "submitted"

    mock_on_chain.assert_awaited_once_with(
        contract_id=contract.on_chain_id,
        milestone_index=0,
        deliverable_cid="QmTestOnChain",
        freelancer_private_key="0xTestFreelancerKey",
    )


@pytest.mark.asyncio
async def test_create_dispute_triggers_on_chain(db_session: AsyncSession):
    """
    P0.3: POST /api/contracts/{id}/disputes calls raise_dispute_on_chain.
    """
    client_user = make_user(role=UserRole.client, id="usr_client_disp")
    freelancer_user = make_user(role=UserRole.freelancer, id="usr_freelancer_disp")
    contract = make_contract(client_user.id, freelancer_user.id, status=ContractStatus.active)

    db_session.add_all([client_user, freelancer_user, contract])
    await db_session.flush()

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return client_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    settings.client_private_key = "0xTestClientKey"

    mock_raise = AsyncMock(return_value="0xDisputeTxHash")

    with patch("app.routers.disputes.raise_dispute_on_chain", mock_raise):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/contracts/{contract.id}/disputes",
                json={"raised_by": "client", "reason": "Work not delivered on time"},
                headers={"Authorization": "Bearer fake-token"},
            )

    app.dependency_overrides.clear()

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["reason"] == "Work not delivered on time"
    assert data["status"] == "open"

    mock_raise.assert_awaited_once_with(
        contract_id=contract.on_chain_id,
        initiator_private_key="0xTestClientKey",
    )


@pytest.mark.asyncio
async def test_admin_resolve_dispute_refund_triggers_on_chain(db_session: AsyncSession):
    """
    P0.3: POST /api/admin/disputes/{id}/resolve with decision='refund'
    calls resolve_dispute_on_chain with correct args.
    """
    admin_user = make_user(role=UserRole.admin, id="usr_admin_resolve")
    client_user = make_user(role=UserRole.client, id="usr_client_resolve")
    freelancer_user = make_user(role=UserRole.freelancer, id="usr_freelancer_resolve")
    contract = make_contract(client_user.id, freelancer_user.id, status=ContractStatus.disputed)
    dispute = Dispute(
        id="dp_test_resolve",
        contract_id=contract.id,
        raised_by="client",
        reason="Not satisfied",
        status=DisputeStatus.open,
    )

    db_session.add_all([admin_user, client_user, freelancer_user, contract, dispute])
    await db_session.flush()

    async def override_get_db():
        yield db_session

    async def override_get_current_admin():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_current_user] = override_get_current_admin

    settings.client_private_key = "0xTestAdminKey"

    mock_resolve = AsyncMock(return_value="0xResolveTxHash")

    with patch("app.routers.admin.resolve_dispute_on_chain", mock_resolve):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/admin/disputes/{dispute.id}/resolve",
                json={"decision": "refund", "notes": "Refunding due to incomplete work"},
                headers={"Authorization": "Bearer fake-token"},
            )

    app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["decision"] == "refund"

    mock_resolve.assert_awaited_once_with(
        contract_id=contract.on_chain_id,
        decision="refund",
        admin_private_key="0xTestAdminKey",
    )


@pytest.mark.asyncio
async def test_admin_resolve_dispute_release_triggers_on_chain(db_session: AsyncSession):
    """
    P0.3: POST /api/admin/disputes/{id}/resolve with decision='release'
    calls resolve_dispute_on_chain with correct args.
    """
    admin_user = make_user(role=UserRole.admin, id="usr_admin_release")
    client_user = make_user(role=UserRole.client, id="usr_client_release")
    freelancer_user = make_user(role=UserRole.freelancer, id="usr_freelancer_release")
    contract = make_contract(client_user.id, freelancer_user.id, status=ContractStatus.disputed)
    dispute = Dispute(
        id="dp_test_release",
        contract_id=contract.id,
        raised_by="client",
        reason="Not satisfied",
        status=DisputeStatus.open,
    )

    db_session.add_all([admin_user, client_user, freelancer_user, contract, dispute])
    await db_session.flush()

    async def override_get_db():
        yield db_session

    async def override_get_current_admin():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_current_user] = override_get_current_admin

    settings.client_private_key = "0xTestAdminKey"

    mock_resolve = AsyncMock(return_value="0xReleaseTxHash")

    with patch("app.routers.admin.resolve_dispute_on_chain", mock_resolve):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/admin/disputes/{dispute.id}/resolve",
                json={"decision": "release", "notes": "Releasing payment"},
                headers={"Authorization": "Bearer fake-token"},
            )

    app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["decision"] == "release"

    mock_resolve.assert_awaited_once_with(
        contract_id=contract.on_chain_id,
        decision="release",
        admin_private_key="0xTestAdminKey",
    )
