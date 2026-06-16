from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import AuthMethod, User
from app.schemas.schemas import (
    ChallengeRequest,
    ChallengeResponse,
    EmailLoginRequest,
    EmailRegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    blacklist_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    delete_nonce,
    delete_refresh_token,
    generate_nonce,
    get_nonce,
    hash_password,
    is_token_blacklisted,
    store_nonce,
    store_refresh_token,
    verify_password,
    verify_signature,
)
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthenticationError, ConflictError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/challenge", response_model=ChallengeResponse)
async def challenge(request: ChallengeRequest, db: AsyncSession = Depends(get_db)):
    nonce = generate_nonce()
    result = await db.execute(
        select(User).where(User.wallet_address == request.address.lower())
    )
    user = result.scalar_one_or_none()
    if not user:
        message = f"Sign this message to create your FreeLedger account: {nonce}"
    else:
        message = f"Sign this message to log in to FreeLedger: {nonce}"
    await store_nonce(request.address, message)
    return ChallengeResponse(nonce=message)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    stored_message = await get_nonce(request.address)
    if not stored_message:
        raise AuthenticationError("No challenge requested or expired", code=ErrorCodes.AUTH_NO_CHALLENGE)

    if not verify_signature(request.address, stored_message, request.signature):
        raise AuthenticationError("Invalid signature", code=ErrorCodes.AUTH_INVALID_SIGNATURE)

    await delete_nonce(request.address)

    address_lower = request.address.lower()
    result = await db.execute(
        select(User).where(User.wallet_address == address_lower)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            wallet_address=address_lower,
            username=f"user_{address_lower[:8]}",
            role=request.role if request.role else "freelancer",
        )
        db.add(user)
        await db.flush()
    elif request.role and request.role != user.role:
        user.role = request.role

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError("Invalid refresh token", code=ErrorCodes.AUTH_INVALID_REFRESH)

    user_id = payload.get("sub")
    blacklisted = await is_token_blacklisted(request.refresh_token)
    if blacklisted:
        raise AuthenticationError("Token revoked", code=ErrorCodes.AUTH_TOKEN_REVOKED)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AuthenticationError("User not found", code=ErrorCodes.AUTH_USER_NOT_FOUND)

    access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    await delete_refresh_token(user_id, request.refresh_token)
    await store_refresh_token(user_id, new_refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/email/register", response_model=TokenResponse)
async def email_register(request: EmailRegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    if result.scalar_one_or_none():
        raise ConflictError("Email already registered", code=ErrorCodes.VALIDATION_EMAIL_EXISTS)

    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        auth_method=AuthMethod.email,
        username=request.username or request.email.split("@")[0],
        role=request.role if request.role else "freelancer",
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/email/login", response_model=TokenResponse)
async def email_login(request: EmailLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise AuthenticationError("Invalid email or password", code=ErrorCodes.AUTH_INVALID_CREDENTIALS)
    if not verify_password(request.password, user.password_hash):
        raise AuthenticationError("Invalid email or password", code=ErrorCodes.AUTH_INVALID_CREDENTIALS)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    authorization: str = Header(None),
):
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            payload = decode_token(token)
            if payload and payload.get("jti"):
                await blacklist_token(payload["jti"], 3600)
    return {"message": "logged_out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
