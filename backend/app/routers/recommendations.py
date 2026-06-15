from datetime import datetime, timezone
from math import exp

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import JSONB

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, UserRole, Job, Proposal
from app.schemas.schemas import (
    UserResponse, JobResponse,
    JobRecommendation, FreelancerRecommendation,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _skill_overlap(a: list[str], b: list[str]) -> float:
    if not a or not b:
        return 0.0
    a_set = {s.lower().strip() for s in a}
    b_set = {s.lower().strip() for s in b}
    intersection = a_set & b_set
    denominator = max(len(a_set), len(b_set))
    return len(intersection) / denominator if denominator else 0.0


def _matched_skills(a: list[str], b: list[str]) -> list[str]:
    if not a or not b:
        return []
    a_set = {s.lower().strip() for s in a}
    b_set = {s.lower().strip() for s in b}
    return list(a_set & b_set)


@router.get("/people", response_model=list[UserResponse])
async def recommend_people(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.client:
        return []

    query = select(User).where(
        User.role == UserRole.freelancer,
        User.is_active == True,
        User.is_available == True,
        User.id != current_user.id,
    )

    if current_user.skills:
        skills_jsonb = cast(User.skills, JSONB)
        skill_conditions = [skills_jsonb.has_key(s) for s in current_user.skills]
        query = query.where(or_(*skill_conditions))

    query = query.order_by(User.rating.desc()).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/jobs", response_model=list[JobRecommendation])
async def recommend_jobs(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.freelancer:
        return []

    now = datetime.now(timezone.utc)
    user_skills = current_user.skills or []
    user_industries = [
        ind.lower().replace("-", " ").replace("_", " ").strip()
        for ind in (current_user.industries or [])
    ]
    hourly_rate = current_user.hourly_rate or 0

    result = await db.execute(
        select(Job).where(Job.status == "open", Job.client_id != current_user.id)
    )
    all_jobs = result.scalars().all()

    if not all_jobs:
        return []

    proposal_result = await db.execute(
        select(Proposal.job_id).where(Proposal.freelancer_id == current_user.id)
    )
    applied_ids = {row[0] for row in proposal_result.fetchall()}

    scored = []
    for job in all_jobs:
        job_skills = job.skills or []
        s_overlap = _skill_overlap(user_skills, job_skills)
        matched = _matched_skills(user_skills, job_skills)

        cat_match = 0.0
        if job.category:
            job_cat = job.category.lower().replace("-", " ").replace("_", " ").strip()
            cat_match = 1.0 if job_cat in user_industries else 0.0
        else:
            cat_match = 0.3

        b_fit = 0.0
        if hourly_rate > 0 and job.budget > 0:
            b_fit = min(job.budget / (hourly_rate * 10), 1.0)
        else:
            b_fit = 0.3

        days_old = (now - job.created_at).days if job.created_at else 30
        recency = exp(-days_old / 30)

        not_applied = 0.0 if job.id in applied_ids else 1.0

        score = (
            s_overlap * 0.35
            + cat_match * 0.20
            + b_fit * 0.20
            + recency * 0.15
            + not_applied * 0.10
        )

        reasons = []
        if s_overlap > 0:
            n = len(matched)
            reasons.append(f"{n} skill match{'es' if n != 1 else ''}")
        if cat_match >= 0.8:
            reasons.append("Matches your industry")
        if b_fit > 0.5:
            reasons.append("Budget aligns with your rate")
        if not_applied:
            reasons.append("Haven't applied yet")

        scored.append(JobRecommendation(
            job=JobResponse.model_validate(job),
            match_score=round(score, 4),
            match_reasons=reasons,
        ))

    scored.sort(key=lambda x: x.match_score, reverse=True)
    return scored[:limit]


@router.get("/freelancers", response_model=list[FreelancerRecommendation])
async def recommend_freelancers(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.client:
        return []

    result = await db.execute(
        select(User).where(
            User.role == UserRole.freelancer,
            User.is_active == True,
            User.id != current_user.id,
        )
    )
    all_freelancers = result.scalars().all()

    if not all_freelancers:
        return []

    client_skills = current_user.skills or []
    client_experience = current_user.experience_level or "mid"

    scored = []
    for f in all_freelancers:
        f_skills = f.skills or []
        s_overlap = _skill_overlap(client_skills, f_skills)
        matched = _matched_skills(client_skills, f_skills)

        exp_match = 1.0 if f.experience_level == client_experience else 0.5
        avail = 1.0 if f.is_available else 0.0
        rating = min(f.rating / 5.0, 1.0) if f.rating else 0.0

        score = s_overlap * 0.40 + exp_match * 0.20 + avail * 0.20 + rating * 0.20

        reasons = []
        if s_overlap > 0:
            n = len(matched)
            reasons.append(f"{n} skill match{'es' if n != 1 else ''}")
        if f.is_available:
            reasons.append("Available now")
        if f.rating >= 4.0:
            reasons.append(f"Top rated ({f.rating:.1f}/5)")

        scored.append(FreelancerRecommendation(
            freelancer=UserResponse.model_validate(f),
            match_score=round(score, 4),
            match_reasons=reasons,
        ))

    scored.sort(key=lambda x: x.match_score, reverse=True)
    return scored[:limit]
