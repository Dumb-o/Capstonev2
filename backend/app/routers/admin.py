from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_admin
from app.models.models import User, Contract, Dispute, ContractStatus, DisputeStatus, DisputeDecision
from app.schemas.schemas import (
    DisputeResponse, DisputeResolve,
    UserResponse, PaginatedUsers, AdminStats,
)
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/disputes", response_model=dict)
async def get_all_disputes(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Dispute)
    if status:
        query = query.where(Dispute.status == DisputeStatus(status))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(Dispute.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    disputes = result.scalars().all()

    return {
        "disputes": [DisputeResponse.model_validate(d) for d in disputes],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
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
        raise NotFoundError("Dispute not found")
    if dispute.status == DisputeStatus.resolved:
        raise ValidationError("Dispute already resolved")

    decision = DisputeDecision(data.decision)
    dispute.status = DisputeStatus.resolved
    dispute.decision = decision
    dispute.resolved_by = admin.id
    dispute.resolution_notes = data.notes

    if decision == DisputeDecision.refund:
        dispute.contract.status = ContractStatus.cancelled
    else:
        dispute.contract.status = ContractStatus.completed

    await db.flush()
    return DisputeResponse.model_validate(dispute)


@router.get("/users", response_model=PaginatedUsers)
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(User)
    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit if total > 0 else 1,
    )


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

    platform_fees = total_volume * 0.025

    return AdminStats(
        total_users=total_users,
        total_contracts=total_contracts,
        total_volume_eth=total_volume,
        active_disputes=active_disputes,
        platform_fees_accumulated=platform_fees,
    )
