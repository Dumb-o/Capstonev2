from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Contract, ContractMilestone, ContractStatus, Job
from app.schemas.schemas import (
    ContractCreate, ContractResponse, ContractDetail,
    MilestoneSubmit, MilestoneReject, MilestoneResponse,
    DisputeResponse,
)
from app.services import contract_service
from app.utils.exceptions import NotFoundError, AuthorizationError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/contracts", tags=["contracts"])


async def _enrich_contract_response(db: AsyncSession, resp: ContractResponse, contract: Contract) -> ContractResponse:
    client_result = await db.execute(select(User.username).where(User.id == contract.client_id))
    client_row = client_result.one_or_none()
    if client_row:
        resp.client_name = client_row[0]

    freelancer_result = await db.execute(select(User.username).where(User.id == contract.freelancer_id))
    freelancer_row = freelancer_result.one_or_none()
    if freelancer_row:
        resp.freelancer_name = freelancer_row[0]

    if contract.job_id:
        job_result = await db.execute(select(Job.title).where(Job.id == contract.job_id))
        job_row = job_result.one_or_none()
        if job_row:
            resp.job_title = job_row[0]

    return resp


async def _enrich_contract(db: AsyncSession, contract: Contract) -> ContractResponse:
    resp = ContractResponse.model_validate(contract)
    return await _enrich_contract_response(db, resp, contract)


async def _enrich_contracts(db: AsyncSession, contracts: list[Contract]) -> list[ContractResponse]:
    return [await _enrich_contract(db, c) for c in contracts]


@router.post("/", response_model=ContractResponse, status_code=201)
async def create_contract(
    data: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_milestone_amount = sum(m.amount for m in data.milestones)
    if abs(total_milestone_amount - data.total_amount) > 0.001:
        raise HTTPException(status_code=400, detail="Milestone amounts must sum to total")

    contract = await contract_service.create_contract(
        db=db, data=data,
        client_id=current_user.id,
        client_wallet=current_user.wallet_address,
    )
    result = await db.execute(
        select(Contract).where(Contract.id == contract.id)
    )
    return await _enrich_contract(db, result.scalar_one())


@router.get("/", response_model=dict)
async def list_contracts(
    status: str | None = Query(None),
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Contract).where(
        (Contract.client_id == current_user.id) | (Contract.freelancer_id == current_user.id)
    )
    if status:
        query = query.where(Contract.status == ContractStatus(status))
    if role == "client":
        query = query.where(Contract.client_id == current_user.id)
    elif role == "freelancer":
        query = query.where(Contract.freelancer_id == current_user.id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(Contract.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    contracts = result.scalars().all()

    return {
        "contracts": await _enrich_contracts(db, contracts),
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
    }


@router.get("/{contract_id}", response_model=ContractDetail)
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload

    query = select(Contract).options(
        selectinload(Contract.dispute)
    ).where(Contract.id == contract_id)
    result = await db.execute(query)
    contract = result.scalar_one_or_none()
    if not contract:
        raise NotFoundError("Contract not found")
    if contract.client_id != current_user.id and contract.freelancer_id != current_user.id:
        raise AuthorizationError("Not a party to this contract")

    milestones_query = select(ContractMilestone).where(
        ContractMilestone.contract_id == contract_id
    ).order_by(ContractMilestone.index)
    milestones_result = await db.execute(milestones_query)
    milestones = milestones_result.scalars().all()

    dispute = None
    if contract.dispute:
        dispute = DisputeResponse.model_validate(contract.dispute)

    enriched = await _enrich_contract(db, contract)
    return ContractDetail(
        contract=enriched,
        milestones=[MilestoneResponse.model_validate(m) for m in milestones],
        dispute=dispute,
    )


@router.post("/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = await contract_service.sign_contract(db, contract_id, current_user.id)
    await db.flush()
    return await _enrich_contract(db, contract)


@router.post("/{contract_id}/fund", response_model=ContractResponse)
async def fund_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = await contract_service.fund_contract(db, contract_id, current_user.id)
    await db.flush()
    return await _enrich_contract(db, contract)


@router.get("/{contract_id}/milestones", response_model=list[MilestoneResponse])
async def get_milestones(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await contract_service.get_milestones(db, contract_id, current_user.id)


@router.post("/{contract_id}/milestones/{milestone_index}/submit", response_model=MilestoneResponse)
async def submit_milestone(
    contract_id: str,
    milestone_index: int,
    data: MilestoneSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    milestone = await contract_service.submit_milestone(
        db, contract_id, milestone_index, data.deliverable_cid, data.notes, current_user.id
    )
    await db.flush()
    return MilestoneResponse.model_validate(milestone)


@router.post("/{contract_id}/milestones/{milestone_index}/approve", response_model=MilestoneResponse)
async def approve_milestone(
    contract_id: str,
    milestone_index: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await contract_service.approve_milestone(db, contract_id, milestone_index, current_user.id)
    await db.flush()
    return result["milestone"]


@router.post("/{contract_id}/milestones/{milestone_index}/reject", response_model=MilestoneResponse)
async def reject_milestone(
    contract_id: str,
    milestone_index: int,
    data: MilestoneReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    milestone = await contract_service.reject_milestone(
        db, contract_id, milestone_index, data.reason, current_user.id
    )
    await db.flush()
    return MilestoneResponse.model_validate(milestone)
