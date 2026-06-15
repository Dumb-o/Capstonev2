import secrets
from datetime import datetime, timedelta, timezone

from eth_account import Account
from eth_account.messages import encode_defunct
from jose import jwt
from passlib.context import CryptContext

from app.config import settings
from app.redis_client import get_redis

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_nonce() -> str:
    return secrets.token_hex(32)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_signature(address: str, message: str, signature: str) -> bool:
    try:
        message_encoded = encode_defunct(text=message)
        recovered = Account.recover_message(message_encoded, signature=signature)
        return recovered.lower() == address.lower()
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    from jose import JWTError
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def store_nonce(address: str, nonce: str) -> None:
    redis = await get_redis()
    await redis.setex(f"nonce:{address.lower()}", 300, nonce)


async def get_nonce(address: str) -> str | None:
    redis = await get_redis()
    return await redis.get(f"nonce:{address.lower()}")


async def delete_nonce(address: str) -> None:
    redis = await get_redis()
    await redis.delete(f"nonce:{address.lower()}")


async def blacklist_token(jti: str, expires_in: int) -> None:
    redis = await get_redis()
    await redis.setex(f"blacklist:{jti}", expires_in, "true")


async def is_token_blacklisted(jti: str) -> bool:
    redis = await get_redis()
    result = await redis.get(f"blacklist:{jti}")
    return result is not None


async def store_refresh_token(user_id: str, token: str) -> None:
    redis = await get_redis()
    expire_seconds = settings.refresh_token_expire_days * 86400
    await redis.setex(f"refresh:{user_id}:{token}", expire_seconds, "true")


async def delete_refresh_token(user_id: str, token: str) -> None:
    redis = await get_redis()
    await redis.delete(f"refresh:{user_id}:{token}")
