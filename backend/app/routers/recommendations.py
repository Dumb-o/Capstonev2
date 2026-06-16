from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, UserRole
from app.schemas.schemas import RecommendedUserResponse


def _normalize(values: list[str]) -> set[str]:
    return {v.lower().strip() for v in values if v and v.strip()}


def _score(
    candidate: User,
    client: User,
) -> tuple[float, float, str]:
    candidate_skills = _normalize(candidate.skills or [])
    candidate_industries = _normalize(candidate.industries or [])
    client_skills = _normalize(client.skills or [])
    client_industries = _normalize(client.industries or [])

    score = 0.0
    score += 2 * len(candidate_skills & client_skills)
    score += 1 * len(candidate_industries & client_industries)
    if candidate.experience_level and candidate.experience_level == client.experience_level:
        score += 1
    if candidate.is_available:
        score += 1
    if candidate.portfolio_cids:
        score += 1
    return float(score), float(candidate.rating or 0.0), candidate.id


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/people", response_model=list[RecommendedUserResponse])
async def recommend_people(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.client:
        return []

    result = await db.execute(
        select(User).where(
            User.role == UserRole.freelancer,
            User.is_active,
            User.id != current_user.id,
        )
    )
    candidates = result.scalars().all()

    ranked = sorted(
        candidates,
        key=lambda u: _score(u, current_user),
        reverse=True,
    )

    top = ranked[:limit]
    return [
        RecommendedUserResponse(
            id=u.id,
            username=u.username,
            headline=u.headline,
            experience_level=u.experience_level or "mid",
            industries=u.industries or [],
            is_available=u.is_available if u.is_available is not None else True,
            portfolio_cids=u.portfolio_cids or [],
            match_score=_score(u, current_user)[0],
        )
        for u in top
    ]
