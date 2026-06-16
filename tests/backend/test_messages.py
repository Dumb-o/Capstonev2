import pytest
import itertools

from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Message, UserRole

_wallet_counter = itertools.count(400)

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


def _override(db_session, user):
    app.dependency_overrides.clear()
    async def override_get_db():
        yield db_session
    async def override_get_current_user():
        return user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_send_message_success(db_session: AsyncSession):
    sender = make_user(role=UserRole.freelancer, id=_uniq_id("sender"))
    receiver = make_user(role=UserRole.client, id=_uniq_id("receiver"))
    db_session.add_all([sender, receiver])
    await db_session.flush()

    transport = _override(db_session, sender)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/messages/send",
            json={"receiver_id": receiver.id, "content": "Hello there!"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 201
    data = resp.json()
    assert data["content"] == "Hello there!"
    assert data["sender_id"] == sender.id
    assert data["receiver_id"] == receiver.id
    assert data["read"] is False


@pytest.mark.asyncio
async def test_send_message_self(db_session: AsyncSession):
    user = make_user(role=UserRole.freelancer, id=_uniq_id("user"))
    db_session.add(user)
    await db_session.flush()

    transport = _override(db_session, user)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/messages/send",
            json={"receiver_id": user.id, "content": "Hello me"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "yourself" in resp.text.lower()


@pytest.mark.asyncio
async def test_send_message_receiver_not_found(db_session: AsyncSession):
    sender = make_user(role=UserRole.freelancer, id=_uniq_id("sender"))
    db_session.add(sender)
    await db_session.flush()

    transport = _override(db_session, sender)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/messages/send",
            json={"receiver_id": "nonexistent_user", "content": "Hello"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_conversations_list(db_session: AsyncSession):
    user_a = make_user(role=UserRole.freelancer, id=_uniq_id("a"), username="alice")
    user_b = make_user(role=UserRole.client, id=_uniq_id("b"), username="bob")
    db_session.add_all([user_a, user_b])
    await db_session.flush()

    msg = Message(sender_id=user_a.id, receiver_id=user_b.id, content="Hi Bob")
    db_session.add(msg)
    await db_session.flush()

    transport = _override(db_session, user_b)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/messages/conversations",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    conv = next(c for c in data if c["user"]["id"] == user_a.id)
    assert conv["last_message"]["content"] == "Hi Bob"
    assert conv["last_message"]["sender_id"] == user_a.id


@pytest.mark.asyncio
async def test_conversation_messages(db_session: AsyncSession):
    user_a = make_user(role=UserRole.freelancer, id=_uniq_id("a"))
    user_b = make_user(role=UserRole.client, id=_uniq_id("b"))
    db_session.add_all([user_a, user_b])
    await db_session.flush()

    for i in range(3):
        db_session.add(Message(sender_id=user_a.id, receiver_id=user_b.id, content=f"Msg {i}"))
    await db_session.flush()

    transport = _override(db_session, user_b)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/messages/conversations/{user_a.id}",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["messages"]) == 3


@pytest.mark.asyncio
async def test_conversation_empty(db_session: AsyncSession):
    user = make_user(role=UserRole.freelancer, id=_uniq_id("user"))
    db_session.add(user)
    await db_session.flush()

    transport = _override(db_session, user)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/messages/conversations",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == []
