import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] in ("ok", "degraded")


@pytest.mark.asyncio
async def test_challenge_endpoint(client):
    response = await client.post(
        "/api/auth/challenge",
        json={"address": "0x1234567890abcdef1234567890abcdef12345678"},
    )
    assert response.status_code == 200
    assert "nonce" in response.json()
    assert "Sign this message" in response.json()["nonce"]


@pytest.mark.asyncio
async def test_challenge_invalid_address(client):
    response = await client.post(
        "/api/auth/challenge",
        json={"address": "invalid"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_without_challenge(client):
    response = await client.post(
        "/api/auth/login",
        json={
            "address": "0x1234567890abcdef1234567890abcdef12345678",
            "signature": "0xinvalid",
        },
    )
    assert response.status_code == 401
    assert "No challenge requested" in response.json()["detail"]
