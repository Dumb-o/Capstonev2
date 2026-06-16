import pytest
import itertools

from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, UserRole

_wallet_counter = itertools.count(700)

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


# ── Email Registration / Login ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_email_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/auth/email/register",
        json={
            "email": "newuser@example.com",
            "password": "strongpass123",
            "username": "newuser",
            "role": "freelancer",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["role"] == "freelancer"


@pytest.mark.asyncio
async def test_email_register_duplicate(client: AsyncClient):
    await client.post(
        "/api/auth/email/register",
        json={"email": "dup@example.com", "password": "strongpass123", "username": "first"},
    )
    resp = await client.post(
        "/api/auth/email/register",
        json={"email": "dup@example.com", "password": "strongpass123", "username": "second"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_email_login_success(client: AsyncClient):
    await client.post(
        "/api/auth/email/register",
        json={"email": "login@example.com", "password": "strongpass123", "username": "loginuser"},
    )
    resp = await client.post(
        "/api/auth/email/login",
        json={"email": "login@example.com", "password": "strongpass123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"


@pytest.mark.asyncio
async def test_email_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/email/register",
        json={"email": "wrongpw@example.com", "password": "strongpass123", "username": "wrongpw"},
    )
    resp = await client.post(
        "/api/auth/email/login",
        json={"email": "wrongpw@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_email_login_nonexistent(client: AsyncClient):
    resp = await client.post(
        "/api/auth/email/login",
        json={"email": "nobody@example.com", "password": "somepass123"},
    )
    assert resp.status_code == 401


# ── Token Refresh ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient):
    reg = await client.post(
        "/api/auth/email/register",
        json={"email": "refresh@example.com", "password": "strongpass123", "username": "refreshuser"},
    )
    refresh_token = reg.json()["refresh_token"]

    resp = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    resp = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalid_token"},
    )
    assert resp.status_code == 401


# ── Logout ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    reg = await client.post(
        "/api/auth/email/register",
        json={"email": "logout@example.com", "password": "strongpass123", "username": "logoutuser"},
    )
    token = reg.json()["access_token"]

    resp = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "logged_out"


# ── Wallet Auth ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_wallet_login_creates_user_on_first_login(client: AsyncClient):
    address = "0x1234567890abcdef1234567890abcdef12345678"
    chall = await client.post("/api/auth/challenge", json={"address": address})
    assert chall.status_code == 200
    nonce = chall.json()["nonce"]

    mock_sig = "0xmocked_signature"
    with patch("app.routers.auth.verify_signature", return_value=True):
        resp = await client.post(
            "/api/auth/login",
            json={"address": address, "signature": mock_sig, "role": "freelancer"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["wallet_address"] == address.lower()
    assert data["user"]["role"] == "freelancer"


@pytest.mark.asyncio
async def test_challenge_invalid_address_format(client: AsyncClient):
    resp = await client.post(
        "/api/auth/challenge",
        json={"address": "not_a_hex_address"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_without_challenge_first(client: AsyncClient):
    address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    mock_sig = "0xmocked"
    with patch("app.routers.auth.verify_signature", return_value=True):
        resp = await client.post(
            "/api/auth/login",
            json={"address": address, "signature": mock_sig},
        )
    assert resp.status_code == 401
    assert "No challenge" in resp.json()["detail"]


# ── Auth Middleware ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    reg = await client.post(
        "/api/auth/email/register",
        json={"email": "me@example.com", "password": "strongpass123", "username": "meuser"},
    )
    token = reg.json()["access_token"]

    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_wrong_scheme(client: AsyncClient):
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Basic some_token"},
    )
    assert resp.status_code == 401
