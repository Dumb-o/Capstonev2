from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import Contract, ContractMilestone, ContractStatus, Job, Message, Proposal, User
from app.schemas.schemas import ProposalCreate, ProposalResponse
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(tags=["proposals"])


async def _enrich_proposals(db: AsyncSession, proposals: list[Proposal]) -> list[ProposalResponse]:
    if not proposals:
        return []

    job_ids = list({p.job_id for p in proposals})
    freelancer_ids = list({p.freelancer_id for p in proposals})

    jobs_result = await db.execute(select(Job.id, Job.title).where(Job.id.in_(job_ids)))
    job_titles = {row[0]: row[1] for row in jobs_result.all()}

    users_result = await db.execute(select(User.id, User.username).where(User.id.in_(freelancer_ids)))
    usernames = {row[0]: row[1] for row in users_result.all()}

    responses = []
    for p in proposals:
        resp = ProposalResponse.model_validate(p)
        resp.job_title = job_titles.get(p.job_id)
        resp.freelancer_name = usernames.get(p.freelancer_id)
        responses.append(resp)
    return responses


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
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    if job.client_id == current_user.id:
        raise ValidationError("Cannot propose on your own job", code=ErrorCodes.VALIDATION_SELF_PROPOSAL)

    existing = await db.execute(
        select(Proposal).where(
            and_(Proposal.job_id == job_id, Proposal.freelancer_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationError("Already proposed on this job", code=ErrorCodes.VALIDATION_DUPLICATE_PROPOSAL)

    proposal = Proposal(
        job_id=job_id,
        freelancer_id=current_user.id,
        cover_letter=data.cover_letter,
        bid_amount=data.bid_amount,
        estimated_days=data.estimated_days,
    )
    db.add(proposal)
    await db.flush()

    msg = Message(
        sender_id=current_user.id,
        receiver_id=job.client_id,
        content=f"{current_user.username or current_user.id[:8]} submitted a proposal for {job.title} — Bid: {data.bid_amount} ETH",
    )
    db.add(msg)
    await db.flush()

    enriched = await _enrich_proposals(db, [proposal])
    return enriched[0]


@router.get("/jobs/{job_id}/proposals", response_model=list[ProposalResponse])
async def list_job_proposals(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can view proposals", code=ErrorCodes.AUTHZ_PROPOSAL_VIEW)

    proposals_result = await db.execute(
        select(Proposal).where(Proposal.job_id == job_id).order_by(Proposal.created_at.desc())
    )
    return await _enrich_proposals(db, proposals_result.scalars().all())


@router.get("/proposals/received", response_model=list[ProposalResponse])
async def get_received_proposals(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs_result = await db.execute(
        select(Job.id).where(Job.client_id == current_user.id)
    )
    job_ids = [row[0] for row in jobs_result.all()]
    if not job_ids:
        return []

    query = select(Proposal).where(Proposal.job_id.in_(job_ids))
    if status:
        query = query.where(Proposal.status == status)
    query = query.order_by(Proposal.created_at.desc())
    result = await db.execute(query)
    return await _enrich_proposals(db, result.scalars().all())


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
    return await _enrich_proposals(db, result.scalars().all())


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
        raise NotFoundError("Proposal not found", code=ErrorCodes.NOT_FOUND_PROPOSAL)

    job_result = await db.execute(select(Job).where(Job.id == proposal.job_id))
    job = job_result.scalar_one_or_none()

    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can update proposal status", code=ErrorCodes.AUTHZ_PROPOSAL_VIEW)

    new_status = data.get("status")
    if new_status not in ("accepted", "rejected"):
        raise ValidationError("Invalid status", code=ErrorCodes.VALIDATION_INVALID_STATUS)

    proposal.status = new_status
    if new_status == "accepted":
        job.status = "in_progress"

        contract = Contract(
            job_id=proposal.job_id,
            client_id=job.client_id,
            freelancer_id=proposal.freelancer_id,
            title=job.title,
            description=job.description,
            total_amount=proposal.bid_amount,
            status=ContractStatus.pending_signatures,
        )
        db.add(contract)
        await db.flush()

        milestone = ContractMilestone(
            contract_id=contract.id,
            index=0,
            description="Full project delivery",
            amount=proposal.bid_amount,
        )
        db.add(milestone)

        proposal.contract_id = contract.id

    await db.flush()
    enriched = await _enrich_proposals(db, [proposal])
    return enriched[0]
