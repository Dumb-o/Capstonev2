from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Contract, Dispute, ContractStatus, DisputeStatus
from app.schemas.schemas import DisputeCreate, DisputeResponse
from app.utils.exceptions import NotFoundError, AuthorizationError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(tags=["disputes"])


@router.post("/contracts/{contract_id}/disputes", response_model=DisputeResponse, status_code=201)
async def create_dispute(
    contract_id: str,
    data: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise NotFoundError("Contract not found")
    if contract.client_id != current_user.id and contract.freelancer_id != current_user.id:
        raise AuthorizationError("Not a party to this contract")
    if contract.status != ContractStatus.active and contract.status != ContractStatus.pending_signatures:
        raise ValidationError("Contract cannot be disputed in its current state")

    existing = await db.execute(select(Dispute).where(Dispute.contract_id == contract_id))
    if existing.scalar_one_or_none():
        raise ValidationError("A dispute already exists for this contract")

    dispute = Dispute(
        contract_id=contract_id,
        raised_by=data.raised_by,
        reason=data.reason,
    )
    contract.status = ContractStatus.disputed
    db.add(dispute)
    await db.flush()
    return DisputeResponse.model_validate(dispute)


@router.get("/disputes", response_model=dict)
async def list_disputes(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Dispute).where(
        (Dispute.contract.has(Contract.client_id == current_user.id)) |
        (Dispute.contract.has(Contract.freelancer_id == current_user.id))
    )
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


@router.get("/disputes/{dispute_id}", response_model=DisputeResponse)
async def get_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise NotFoundError("Dispute not found")

    contract = dispute.contract
    if contract.client_id != current_user.id and contract.freelancer_id != current_user.id:
        raise AuthorizationError("Not a party to this contract")

    return DisputeResponse.model_validate(dispute)
