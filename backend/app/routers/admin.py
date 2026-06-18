from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_admin
from app.models.models import (
    AdminAccount,
    Contract,
    ContractStatus,
    Dispute,
    DisputeDecision,
    DisputeStatus,
    Job,
    Message,
    Proposal,
    User,
)
from app.routers.contracts import _enrich_contract, _enrich_contracts
from app.routers.proposals import _enrich_proposals
from app.schemas.schemas import (
    AdminContractCreate,
    AdminDisputeCreate,
    AdminJobCreate,
    AdminProposalCreate,
    AdminStats,
    AdminUserCreate,
    ContractResponse,
    DisputeResolve,
    DisputeResponse,
    JobResponse,
    MessageResponse,
    PaginatedUsers,
    ProposalResponse,
    UserResponse,
)
from app.services.auth_service import hash_password
from app.services.blockchain_service import resolve_dispute_on_chain
from app.services.notification_service import NotificationService
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_contracts = (await db.execute(select(func.count(Contract.id)))).scalar()

    volume_result = await db.execute(
        select(func.coalesce(func.sum(Contract.total_amount), 0))
        .where(Contract.status == ContractStatus.completed)
    )
    total_volume = float(volume_result.scalar())

    active_disputes = (await db.execute(
        select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.open)
    )).scalar()

    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar()
    total_proposals = (await db.execute(select(func.count(Proposal.id)))).scalar()

    platform_fees = total_volume * 0.025

    from app.models.models import UserRole
    role_counts = {}
    for role in UserRole:
        count = (await db.execute(
            select(func.count(User.id)).where(User.role == role)
        )).scalar()
        role_counts[role.value] = count

    return AdminStats(
        total_users=total_users,
        total_jobs=total_jobs,
        total_proposals=total_proposals,
        total_contracts=total_contracts,
        total_volume_eth=total_volume,
        active_disputes=active_disputes,
        platform_fees_accumulated=platform_fees,
        role_counts=role_counts,
    )


@router.get("/users", response_model=PaginatedUsers)
async def get_all_users(
    search: str | None = Query(None),
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(User.username.ilike(pattern), User.email.ilike(pattern))
        )
    if role:
        from app.models.models import UserRole
        query = query.where(User.role == UserRole(role))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(User.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        pages=(total + page_limit - 1) // page_limit if total > 0 else 1,
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found", code=ErrorCodes.NOT_FOUND_USER)

    from app.models.models import UserRole
    if "username" in data:
        user.username = data["username"]
    if "email" in data:
        user.email = data["email"].lower()
    if "role" in data:
        user.role = UserRole(data["role"])
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "is_available" in data:
        user.is_available = data["is_available"]
    if "headline" in data:
        user.headline = data["headline"]
    if "bio" in data:
        user.bio = data["bio"]
    if "hourly_rate" in data:
        user.hourly_rate = float(data["hourly_rate"])
    if "skills" in data:
        user.skills = data["skills"]
    if "experience_level" in data:
        user.experience_level = data["experience_level"]
    if "industries" in data:
        user.industries = data["industries"]
    if "portfolio_cids" in data:
        user.portfolio_cids = data["portfolio_cids"]

    await db.flush()
    return UserResponse.model_validate(user)


@router.post("/users", response_model=UserResponse, status_code=201)
async def admin_create_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise ValidationError("Email already registered", code=ErrorCodes.VALIDATION_EMAIL_EXISTS)

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        auth_method="email",
        username=data.username or data.email.split("@")[0],
        role=data.role,
        hourly_rate=data.hourly_rate,
        is_active=True,
    )
    if data.headline is not None:
        user.headline = data.headline
    if data.experience_level is not None:
        user.experience_level = data.experience_level
    if data.industries is not None:
        user.industries = data.industries
    if data.is_available is not None:
        user.is_available = data.is_available
    if data.portfolio_cids is not None:
        user.portfolio_cids = data.portfolio_cids
    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)


@router.post("/jobs", response_model=JobResponse, status_code=201)
async def admin_create_job(
    data: AdminJobCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    client = await db.execute(select(User).where(User.id == data.client_id))
    if not client.scalar_one_or_none():
        raise NotFoundError("Client not found", code=ErrorCodes.NOT_FOUND_CLIENT)

    job = Job(
        client_id=data.client_id,
        title=data.title,
        description=data.description,
        budget=data.budget,
        category=data.category,
        skills=data.skills,
        duration_days=data.duration_days,
        status=data.status or "open",
    )
    db.add(job)
    await db.flush()
    return JobResponse.model_validate(job)


@router.get("/jobs", response_model=dict)
async def get_all_jobs(
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Job)
    if status:
        query = query.where(Job.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(Job.title.ilike(pattern))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(Job.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return {
        "jobs": [JobResponse.model_validate(j) for j in jobs],
        "total": total,
        "page": page,
        "pages": (total + page_limit - 1) // page_limit if total > 0 else 1,
    }


@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)

    if "title" in data:
        job.title = data["title"]
    if "description" in data:
        job.description = data["description"]
    if "budget" in data:
        job.budget = float(data["budget"])
    if "category" in data:
        job.category = data["category"]
    if "status" in data:
        job.status = data["status"]
    if "skills" in data:
        job.skills = data["skills"]
    if "duration_days" in data:
        job.duration_days = int(data["duration_days"])

    await db.flush()
    return JobResponse.model_validate(job)


@router.get("/contracts", response_model=dict)
async def get_all_contracts(
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Contract)
    if status:
        query = query.where(Contract.status == ContractStatus(status))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(Contract.title.ilike(pattern), Contract.description.ilike(pattern))
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(Contract.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    contracts = result.scalars().all()

    return {
        "contracts": await _enrich_contracts(db, contracts),
        "total": total,
        "page": page,
        "pages": (total + page_limit - 1) // page_limit if total > 0 else 1,
    }


@router.put("/contracts/{contract_id}", response_model=dict)
async def update_contract(
    contract_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)

    if "title" in data:
        contract.title = data["title"]
    if "description" in data:
        contract.description = data["description"]
    if "total_amount" in data:
        contract.total_amount = float(data["total_amount"])
    if "status" in data:
        contract.status = ContractStatus(data["status"])

    await db.flush()
    enriched = await _enrich_contract(db, contract)
    return {"contract": enriched.model_dump()}


@router.post("/contracts", response_model=ContractResponse, status_code=201)
async def admin_create_contract(
    data: AdminContractCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    client = await db.execute(select(User).where(User.id == data.client_id))
    if not client.scalar_one_or_none():
        raise NotFoundError("Client not found", code=ErrorCodes.NOT_FOUND_CLIENT)

    freelancer = await db.execute(select(User).where(User.id == data.freelancer_id))
    if not freelancer.scalar_one_or_none():
        raise NotFoundError("Freelancer not found", code=ErrorCodes.NOT_FOUND_FREELANCER)

    contract = Contract(
        job_id=data.job_id,
        client_id=data.client_id,
        freelancer_id=data.freelancer_id,
        title=data.title,
        description=data.description,
        total_amount=data.total_amount,
        deadline=data.deadline,
        status=ContractStatus(data.status) if data.status else ContractStatus.pending_signatures,
    )
    db.add(contract)
    await db.flush()
    return await _enrich_contract(db, contract)


@router.get("/proposals", response_model=dict)
async def get_all_proposals(
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Proposal)
    if status:
        query = query.where(Proposal.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(Proposal.cover_letter.ilike(pattern))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(Proposal.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    proposals = result.scalars().all()

    return {
        "proposals": await _enrich_proposals(db, proposals),
        "total": total,
        "page": page,
        "pages": (total + page_limit - 1) // page_limit if total > 0 else 1,
    }


@router.get("/messages", response_model=dict)
async def get_all_messages(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Message)
    if search:
        pattern = f"%{search}%"
        query = query.where(Message.content.ilike(pattern))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(Message.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    return {
        "messages": [MessageResponse.model_validate(m) for m in messages],
        "total": total,
        "page": page,
        "pages": (total + page_limit - 1) // page_limit if total > 0 else 1,
    }


@router.get("/disputes", response_model=dict)
async def get_all_disputes(
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Dispute)
    if status:
        query = query.where(Dispute.status == DisputeStatus(status))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(Dispute.reason.ilike(pattern), Dispute.raised_by.ilike(pattern))
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    page_offset, page_limit = pagination_params(page, limit)
    query = query.order_by(Dispute.created_at.desc()).offset(page_offset).limit(page_limit)
    result = await db.execute(query)
    disputes = result.scalars().all()

    return {
        "disputes": [DisputeResponse.model_validate(d) for d in disputes],
        "total": total,
        "page": page,
        "pages": (total + page_limit - 1) // page_limit if total > 0 else 1,
    }


@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    dispute_id: str,
    data: DisputeResolve,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise NotFoundError("Dispute not found", code=ErrorCodes.NOT_FOUND_DISPUTE)
    if dispute.status == DisputeStatus.resolved:
        raise ValidationError("Dispute already resolved", code=ErrorCodes.VALIDATION_DISPUTE_RESOLVED)

    decision = DisputeDecision(data.decision)
    dispute.status = DisputeStatus.resolved
    dispute.decision = decision
    dispute.resolved_by = admin.id
    dispute.resolution_notes = data.notes

    pk = settings.client_private_key
    if pk and dispute.contract.on_chain_id is not None:
        await resolve_dispute_on_chain(
            contract_id=dispute.contract.on_chain_id,
            decision=decision.value,
            admin_private_key=pk,
        )

    if decision == DisputeDecision.refund:
        dispute.contract.status = ContractStatus.cancelled
    else:
        dispute.contract.status = ContractStatus.completed

    await db.flush()

    for uid in [dispute.contract.client_id, dispute.contract.freelancer_id]:
        await NotificationService.create(
            db, uid, "dispute",
            "Dispute resolved",
            f"The dispute on {dispute.contract.title} has been resolved. Decision: {decision.value}",
        )

    return DisputeResponse.model_validate(dispute)


@router.post("/disputes", response_model=DisputeResponse, status_code=201)
async def admin_create_dispute(
    data: AdminDisputeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    contract = await db.execute(select(Contract).where(Contract.id == data.contract_id))
    contract = contract.scalar_one_or_none()
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)

    existing = await db.execute(
        select(Dispute).where(Dispute.contract_id == data.contract_id)
    )
    if existing.scalar_one_or_none():
        raise ValidationError("Dispute already exists for this contract", code=ErrorCodes.VALIDATION_DUPLICATE_DISPUTE)

    dispute = Dispute(
        contract_id=data.contract_id,
        raised_by=data.raised_by,
        reason=data.reason,
    )
    db.add(dispute)
    contract.status = ContractStatus.disputed
    await db.flush()
    return DisputeResponse.model_validate(dispute)


@router.post("/proposals", response_model=ProposalResponse, status_code=201)
async def admin_create_proposal(
    data: AdminProposalCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    job = await db.execute(select(Job).where(Job.id == data.job_id))
    if not job.scalar_one_or_none():
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)

    freelancer = await db.execute(select(User).where(User.id == data.freelancer_id))
    if not freelancer.scalar_one_or_none():
        raise NotFoundError("Freelancer not found", code=ErrorCodes.NOT_FOUND_FREELANCER)

    proposal = Proposal(
        job_id=data.job_id,
        freelancer_id=data.freelancer_id,
        cover_letter=data.cover_letter,
        bid_amount=data.bid_amount,
        estimated_days=data.estimated_days,
        status="pending",
    )
    db.add(proposal)
    await db.flush()
    enriched = await _enrich_proposals(db, [proposal])
    return enriched[0]


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found", code=ErrorCodes.NOT_FOUND_USER)

    contract_ids = (await db.execute(
        select(Contract.id).where(
            (Contract.client_id == user_id) | (Contract.freelancer_id == user_id)
        )
    )).scalars().all()

    if contract_ids:
        contract_disputes = await db.execute(
            select(Dispute).where(Dispute.contract_id.in_(contract_ids))
        )
        for d in contract_disputes.scalars():
            await db.delete(d)

        contracts = await db.execute(
            select(Contract).where(Contract.id.in_(contract_ids))
        )
        for c in contracts.scalars():
            await db.delete(c)

    proposals = await db.execute(select(Proposal).where(Proposal.freelancer_id == user_id))
    for prop in proposals.scalars():
        await db.delete(prop)

    jobs = await db.execute(select(Job).where(Job.client_id == user_id))
    for job in jobs.scalars():
        await db.delete(job)

    messages = await db.execute(
        select(Message).where(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        )
    )
    for msg in messages.scalars():
        await db.delete(msg)

    admin_accounts = await db.execute(
        select(AdminAccount).where(AdminAccount.user_id == user_id)
    )
    for a in admin_accounts.scalars():
        await db.delete(a)

    disputes = await db.execute(
        select(Dispute).where(Dispute.resolved_by == user_id)
    )
    for d in disputes.scalars():
        d.resolved_by = None

    await db.execute(User.__table__.delete().where(User.id == user_id))
    await db.flush()
    return {"ok": True}


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    await db.delete(job)
    await db.flush()
    return {"ok": True}


@router.put("/proposals/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise NotFoundError("Proposal not found", code=ErrorCodes.NOT_FOUND_PROPOSAL)
    if "status" in data:
        proposal.status = data["status"]
    if "bid_amount" in data:
        proposal.bid_amount = float(data["bid_amount"])
    if "cover_letter" in data:
        proposal.cover_letter = data["cover_letter"]
    if "estimated_days" in data:
        proposal.estimated_days = int(data["estimated_days"])
    await db.flush()
    return ProposalResponse.model_validate(proposal)


@router.delete("/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise NotFoundError("Proposal not found", code=ErrorCodes.NOT_FOUND_PROPOSAL)
    await db.delete(proposal)
    await db.flush()
    return {"ok": True}


@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    await db.delete(contract)
    await db.flush()
    return {"ok": True}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        raise NotFoundError("Message not found", code=ErrorCodes.NOT_FOUND_MESSAGE)
    await db.delete(message)
    await db.flush()
    return {"ok": True}


@router.put("/disputes/{dispute_id}", response_model=DisputeResponse)
async def update_dispute(
    dispute_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise NotFoundError("Dispute not found", code=ErrorCodes.NOT_FOUND_DISPUTE)
    if "reason" in data:
        dispute.reason = data["reason"]
    if "status" in data:
        dispute.status = DisputeStatus(data["status"])
    if "decision" in data:
        dispute.decision = DisputeDecision(data["decision"])
    await db.flush()
    return DisputeResponse.model_validate(dispute)


@router.delete("/disputes/{dispute_id}")
async def delete_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise NotFoundError("Dispute not found", code=ErrorCodes.NOT_FOUND_DISPUTE)
    await db.delete(dispute)
    await db.flush()
    return {"ok": True}
