from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, UserRole
from app.schemas.schemas import PaginatedRecommendedUsers, RecommendedUserResponse
from app.utils.helpers import pagination_params


def _normalize(values: list[str]) -> set[str]:
    return {v.lower().strip() for v in values if v and v.strip()}


def _score(
    candidate: User,
    current_user: User,
) -> tuple[float, float, str]:
    candidate_skills = _normalize(candidate.skills or [])
    candidate_industries = _normalize(candidate.industries or [])
    current_skills = _normalize(current_user.skills or [])
    current_industries = _normalize(current_user.industries or [])

    score = 0.0
    score += 2 * len(candidate_skills & current_skills)
    score += 1 * len(candidate_industries & current_industries)
    if candidate.experience_level and candidate.experience_level == current_user.experience_level:
        score += 1
    if candidate.is_available:
        score += 1
    if candidate.portfolio_cids:
        score += 1
    return float(score), float(candidate.rating or 0.0), candidate.id


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/people", response_model=PaginatedRecommendedUsers)
async def recommend_people(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(
            User.role == UserRole.freelancer,
            User.is_active,
            User.id != current_user.id,
        )
    )
    candidates = result.scalars().all()

    scored = [(u, _score(u, current_user)) for u in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)

    total = len(scored)
    offset, page_limit = pagination_params(page, limit)
    page_items = scored[offset: offset + page_limit]

    current_skills = _normalize(current_user.skills or [])
    users = []
    for u, (composite, _rating, _uid) in page_items:
        candidate_skills = _normalize(u.skills or [])
        overlap = float(len(candidate_skills & current_skills))
        users.append(RecommendedUserResponse(
            id=u.id,
            username=u.username,
            role=u.role.value,
            headline=u.headline,
            skills=u.skills or [],
            experience_level=u.experience_level or "mid",
            industries=u.industries or [],
            is_available=u.is_available if u.is_available is not None else True,
            portfolio_cids=u.portfolio_cids or [],
            overlap_score=overlap,
            match_score=composite,
        ))

    return PaginatedRecommendedUsers(
        users=users,
        total=total,
        page=page,
        pages=(total + page_limit - 1) // page_limit if total > 0 else 1,
    )
