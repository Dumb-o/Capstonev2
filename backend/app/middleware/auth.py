from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import User
from app.services.auth_service import decode_token, is_token_blacklisted
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthenticationError


async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization:
        raise AuthenticationError("Missing authorization header", code=ErrorCodes.AUTH_MISSING_HEADER)

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AuthenticationError("Invalid authorization scheme", code=ErrorCodes.AUTH_INVALID_SCHEME)

    payload = decode_token(token)
    if payload is None:
        raise AuthenticationError("Invalid or expired token", code=ErrorCodes.AUTH_INVALID_TOKEN)

    user_id: str = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("Invalid token payload", code=ErrorCodes.AUTH_INVALID_PAYLOAD)

    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise AuthenticationError("Token has been revoked", code=ErrorCodes.AUTH_TOKEN_REVOKED)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise AuthenticationError("User not found or inactive", code=ErrorCodes.AUTH_USER_INACTIVE)

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role.value != "admin":
        from app.utils.exceptions import AuthorizationError
        raise AuthorizationError("Admin access required", code=ErrorCodes.AUTHZ_ADMIN_REQUIRED)
    return current_user
