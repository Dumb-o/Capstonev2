from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import Contract, ContractStatus, Dispute, DisputeStatus, User
from app.schemas.schemas import DisputeCreate, DisputeResponse
from app.services.blockchain_service import raise_dispute_on_chain
from app.services.notification_service import NotificationService
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthorizationError, NotFoundError, ValidationError
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
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != current_user.id and contract.freelancer_id != current_user.id:
        raise AuthorizationError("Not a party to this contract", code=ErrorCodes.AUTHZ_CONTRACT_PARTY)
    if contract.status != ContractStatus.active and contract.status != ContractStatus.pending_signatures:
        raise ValidationError("Contract cannot be disputed in its current state", code=ErrorCodes.VALIDATION_DISPUTE_STATE)

    existing = await db.execute(select(Dispute).where(Dispute.contract_id == contract_id))
    if existing.scalar_one_or_none():
        raise ValidationError("A dispute already exists for this contract", code=ErrorCodes.VALIDATION_DUPLICATE_DISPUTE)

    dispute = Dispute(
        contract_id=contract_id,
        raised_by=data.raised_by,
        reason=data.reason,
    )
    contract.status = ContractStatus.disputed
    db.add(dispute)
    await db.flush()

    pk = settings.client_private_key
    if pk and contract.on_chain_id is not None:
        await raise_dispute_on_chain(
            contract_id=contract.on_chain_id,
            initiator_private_key=pk,
        )

    other_id = contract.freelancer_id if current_user.id == contract.client_id else contract.client_id
    await NotificationService.create(
        db, other_id, "dispute",
        "Dispute raised",
        f"A dispute has been raised on contract: {contract.title}",
    )

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
        raise NotFoundError("Dispute not found", code=ErrorCodes.NOT_FOUND_DISPUTE)

    contract = dispute.contract
    if contract.client_id != current_user.id and contract.freelancer_id != current_user.id:
        raise AuthorizationError("Not a party to this contract", code=ErrorCodes.AUTHZ_CONTRACT_PARTY)

    return DisputeResponse.model_validate(dispute)
