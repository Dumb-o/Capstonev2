import pytest
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from sqlalchemy import select

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import Message, Thread, User, Job, Proposal, Contract, ContractMilestone, UserRole

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


# ── Queue-23: Proposal-to-Message Auto-Thread ──────────────────────────────

@pytest.mark.asyncio
async def test_proposal_creates_system_message(db_session: AsyncSession):
    """Proposal creation inserts a system Message."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="job_owner")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Build API")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "I can build it", "bid_amount": 5.0, "estimated_days": 10},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    msgs = (await db_session.execute(
        select(Message).where(Message.sender_id == freelancer.id, Message.receiver_id == client.id)
    )).scalars().all()
    assert len(msgs) == 1
    assert msgs[0].sender_id == freelancer.id
    assert msgs[0].receiver_id == client.id


@pytest.mark.asyncio
async def test_proposal_system_message_format(db_session: AsyncSession):
    """System message matches required format."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Smart Contract Audit")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Expert in Solidity", "bid_amount": 2.5, "estimated_days": 7},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    msgs = (await db_session.execute(
        select(Message).where(Message.sender_id == freelancer.id)
    )).scalars().all()
    assert len(msgs) == 1
    msg = msgs[0]
    assert msg.content == "alice submitted a proposal for Smart Contract Audit — Bid: 2.5 ETH"
    assert msg.sender_id == freelancer.id
    assert msg.receiver_id == client.id
    assert msg.read is False


@pytest.mark.asyncio
async def test_proposal_system_message_username_fallback(db_session: AsyncSession):
    """When username is None, falls back to id prefix in message."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username=None)
    job = make_job(client.id, title="Debug")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Will do", "bid_amount": 1.0, "estimated_days": 2},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    msgs = (await db_session.execute(
        select(Message).where(Message.sender_id == freelancer.id)
    )).scalars().all()
    assert len(msgs) == 1
    assert "A freelancer" in msgs[0].content
    assert str(1.0) in msgs[0].content


@pytest.mark.asyncio
async def test_proposal_multiple_proposals_multiple_messages(db_session: AsyncSession):
    """Multiple proposals between same users create separate messages, no duplicate check."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job_a = make_job(client.id, id=_uniq_id("job_a"), title="Job A")
    job_b = make_job(client.id, id=_uniq_id("job_b"), title="Job B")
    db_session.add_all([client, freelancer, job_a, job_b])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        for job in (job_a, job_b):
            resp = await httpx.post(
                f"/api/jobs/{job.id}/proposals",
                json={"cover_letter": "Interested", "bid_amount": 3.0, "estimated_days": 5},
                headers={"Authorization": "Bearer fake-token"},
            )
            assert resp.status_code == 201
    app.dependency_overrides.clear()

    msgs = (await db_session.execute(
        select(Message).where(
            Message.sender_id == freelancer.id,
            Message.receiver_id == client.id,
        )
    )).scalars().all()
    assert len(msgs) == 2
    assert all(m.sender_id == freelancer.id for m in msgs)
    assert all(m.receiver_id == client.id for m in msgs)


@pytest.mark.asyncio
async def test_proposal_message_visible_to_both_users(db_session: AsyncSession):
    """System message appears in the conversation for both users."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Test Job")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Can do", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    for user, other_id in [(client, freelancer.id), (freelancer, client.id)]:
        transport = _override(db_session, user)
        async with AsyncClient(transport=transport, base_url="http://test") as httpx:
            resp = await httpx.get(
                f"/api/messages/conversations/{other_id}",
                headers={"Authorization": "Bearer fake-token"},
            )
        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["messages"]) >= 1
        assert "submitted a proposal" in data["messages"][0]["content"]


@pytest.mark.asyncio
async def test_proposal_no_duplicate_message_on_same_proposal(db_session: AsyncSession):
    """Submitting the same proposal again fails (duplicate check), no extra message."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Unique")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "First", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert resp.status_code == 201

        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Duplicate", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert resp.status_code == 400
    app.dependency_overrides.clear()

    msgs = (await db_session.execute(
        select(Message).where(
            Message.sender_id == freelancer.id,
            Message.receiver_id == client.id,
        )
    )).scalars().all()
    assert len(msgs) == 1


@pytest.mark.asyncio
async def test_proposal_message_does_not_break_existing_messaging(db_session: AsyncSession):
    """System message coexists with regular messages between same users."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Chat Test")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            "/api/messages/send",
            json={"receiver_id": client.id, "content": "Hey, interested in your job"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert resp.status_code == 201

        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Let me do it", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert resp.status_code == 201
    app.dependency_overrides.clear()

    transport = _override(db_session, client)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.get(
            f"/api/messages/conversations/{freelancer.id}",
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["messages"]) == 2
    contents = [m["content"] for m in data["messages"]]
    assert "Hey, interested in your job" in contents
    assert any("submitted a proposal" in c for c in contents)


@pytest.mark.asyncio
async def test_proposal_creates_thread(db_session: AsyncSession):
    """Proposal creation creates a Thread and associates the Message."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Thread Test")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "Test thread", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    threads = (await db_session.execute(
        select(Thread).where(
            Thread.client_id == client.id,
            Thread.freelancer_id == freelancer.id,
            Thread.job_id == job.id,
        )
    )).scalars().all()
    assert len(threads) == 1
    thread = threads[0]

    msgs = (await db_session.execute(
        select(Message).where(Message.thread_id == thread.id)
    )).scalars().all()
    assert len(msgs) == 1
    assert msgs[0].sender_id == freelancer.id
    assert msgs[0].receiver_id == client.id


@pytest.mark.asyncio
async def test_proposal_reuses_thread(db_session: AsyncSession):
    """get_or_create_thread returns existing thread for same client+freelancer+job."""
    client = make_user(role=UserRole.client, id=_uniq_id("client"), username="bob")
    freelancer = make_user(role=UserRole.freelancer, id=_uniq_id("freelancer"), username="alice")
    job = make_job(client.id, title="Reuse Thread")
    db_session.add_all([client, freelancer, job])
    await db_session.flush()

    transport = _override(db_session, freelancer)
    async with AsyncClient(transport=transport, base_url="http://test") as httpx:
        resp = await httpx.post(
            f"/api/jobs/{job.id}/proposals",
            json={"cover_letter": "First", "bid_amount": 5.0, "estimated_days": 3},
            headers={"Authorization": "Bearer fake-token"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201

    from app.services.message_service import MessageService
    thread = await MessageService.get_or_create_thread(
        db_session, client_id=client.id, freelancer_id=freelancer.id, job_id=job.id
    )
    assert thread is not None
    threads = (await db_session.execute(
        select(Thread).where(
            Thread.client_id == client.id,
            Thread.freelancer_id == freelancer.id,
            Thread.job_id == job.id,
        )
    )).scalars().all()
    assert len(threads) == 1
    assert threads[0].id == thread.id
