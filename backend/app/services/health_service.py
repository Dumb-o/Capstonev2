import httpx
from sqlalchemy import text
from web3 import Web3

from app.config import settings
from app.database import async_session_factory
from app.redis_client import redis_client
from app.services.event_listener import event_listener_running


async def check_database() -> dict:
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def check_redis() -> dict:
    try:
        if redis_client is None:
            return {"status": "error", "detail": "not initialized"}
        await redis_client.ping()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def check_ipfs() -> dict:
    try:
        url = f"{settings.ipfs_api_url}/api/v0/version"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url)
            response.raise_for_status()
            data = response.json()
            return {"status": "ok", "version": data.get("Version", "unknown")}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def check_blockchain() -> dict:
    try:
        w3 = Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 5}))
        if not w3.is_connected():
            return {"status": "error", "detail": "not connected"}
        return {
            "status": "ok",
            "chain_id": w3.eth.chain_id,
            "block_number": w3.eth.block_number,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


def check_event_listener() -> dict:
    if settings.client_private_key:
        return {"status": "ok" if event_listener_running else "error", "detail": "running" if event_listener_running else "not started"}
    return {"status": "disabled", "detail": "no private key configured"}
