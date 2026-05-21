from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Job, Proposal
from app.schemas.schemas import ProposalCreate, ProposalResponse
from app.utils.exceptions import NotFoundError, AuthorizationError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(tags=["proposals"])


@router.post("/jobs/{job_id}/proposals", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    job_id: str,
    data: ProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found")
    if job.client_id == current_user.id:
        raise ValidationError("Cannot propose on your own job")

    existing = await db.execute(
        select(Proposal).where(
            and_(Proposal.job_id == job_id, Proposal.freelancer_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationError("Already proposed on this job")

    proposal = Proposal(
        job_id=job_id,
        freelancer_id=current_user.id,
        cover_letter=data.cover_letter,
        bid_amount=data.bid_amount,
        estimated_days=data.estimated_days,
    )
    db.add(proposal)
    await db.flush()
    return ProposalResponse.model_validate(proposal)


@router.get("/jobs/{job_id}/proposals", response_model=list[ProposalResponse])
async def list_job_proposals(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found")
    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can view proposals")

    proposals_result = await db.execute(
        select(Proposal).where(Proposal.job_id == job_id).order_by(Proposal.created_at.desc())
    )
    return [ProposalResponse.model_validate(p) for p in proposals_result.scalars().all()]


@router.get("/proposals/mine", response_model=list[ProposalResponse])
async def get_my_proposals(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Proposal).where(Proposal.freelancer_id == current_user.id)
    if status:
        query = query.where(Proposal.status == status)
    query = query.order_by(Proposal.created_at.desc())
    offset, limit = pagination_params(page, limit)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return [ProposalResponse.model_validate(p) for p in result.scalars().all()]


@router.put("/proposals/{proposal_id}", response_model=ProposalResponse)
async def update_proposal_status(
    proposal_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise NotFoundError("Proposal not found")

    job_result = await db.execute(select(Job).where(Job.id == proposal.job_id))
    job = job_result.scalar_one_or_none()

    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can update proposal status")

    new_status = data.get("status")
    if new_status not in ("accepted", "rejected"):
        raise ValidationError("Invalid status")

    proposal.status = new_status
    if new_status == "accepted":
        job.status = "in_progress"

    await db.flush()
    return ProposalResponse.model_validate(proposal)
