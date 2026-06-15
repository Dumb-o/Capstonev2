from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, cast, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import JSONB

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, UserRole
from app.schemas.schemas import UserResponse, UserUpdate, PaginatedUsers
from app.utils.exceptions import NotFoundError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.username is not None:
        current_user.username = data.username
    if data.bio is not None:
        current_user.bio = data.bio
    if data.skills is not None:
        current_user.skills = data.skills
    if data.hourly_rate is not None:
        current_user.hourly_rate = data.hourly_rate
    if data.avatar_cid is not None:
        current_user.avatar_cid = data.avatar_cid
    if data.headline is not None:
        current_user.headline = data.headline
    if data.experience_level is not None:
        current_user.experience_level = data.experience_level
    if data.industries is not None:
        current_user.industries = data.industries
    if data.is_available is not None:
        current_user.is_available = data.is_available
    if data.portfolio_cids is not None:
        current_user.portfolio_cids = data.portfolio_cids

    await db.flush()
    return UserResponse.model_validate(current_user)


@router.get("/", response_model=PaginatedUsers)
async def list_users(
    role: str | None = Query(None),
    search: str | None = Query(None),
    skills: str | None = Query(None),
    experience_level: str | None = Query(None),
    is_available: bool | None = Query(None),
    min_rate: float | None = Query(None, ge=0),
    max_rate: float | None = Query(None, ge=0),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(User.is_active == True)

    if role:
        query = query.where(User.role == UserRole(role))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.username.ilike(pattern),
                User.headline.ilike(pattern),
                User.bio.ilike(pattern),
            )
        )
    if skills:
        skill_list = [s.strip() for s in skills.split(",") if s.strip()]
        if skill_list:
            skills_jsonb = cast(User.skills, JSONB)
            conditions = [skills_jsonb.has_key(s) for s in skill_list]
            query = query.where(or_(*conditions))
    if experience_level:
        query = query.where(User.experience_level == experience_level)
    if is_available is not None:
        query = query.where(User.is_available == is_available)
    if min_rate is not None:
        query = query.where(User.hourly_rate >= min_rate)
    if max_rate is not None:
        query = query.where(User.hourly_rate <= max_rate)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(User.rating.desc(), User.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        pages=(total + page_limit - 1) // page_limit if total > 0 else 1,
    )
