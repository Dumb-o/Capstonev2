import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_challenge_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/challenge",
            json={"address": "0x1234567890abcdef1234567890abcdef12345678"},
        )
        assert response.status_code == 200
        assert "nonce" in response.json()
        assert "Sign this message" in response.json()["nonce"]


@pytest.mark.asyncio
async def test_challenge_invalid_address():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/challenge",
            json={"address": "invalid"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_without_challenge():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "address": "0x1234567890abcdef1234567890abcdef12345678",
                "signature": "0xinvalid",
            },
        )
        assert response.status_code == 401
        assert "No challenge requested" in response.json()["detail"]
