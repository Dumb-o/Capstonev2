import json

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Contract, ContractMilestone, ContractStatus
from app.schemas.schemas import (
    ContractCreate, ContractResponse, ContractDetail,
    MilestoneSubmit, MilestoneReject, MilestoneResponse,
)
from app.services import contract_service
from app.utils.exceptions import NotFoundError, AuthorizationError, ValidationError

router = APIRouter(prefix="/contracts", tags=["contracts"])


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
        private_key="",  # TODO: get from secure key management
    )
    # Since no private key yet, create off-chain first
    result = await db.execute(
        select(Contract).where(Contract.id == contract.id)
    )
    return ContractResponse.model_validate(result.scalar_one())


@router.get("/", response_model=dict)
async def list_contracts(
    status: str | None = Query(None),
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await contract_service.get_contracts(
        db=db, user_id=current_user.id,
        status=status, role=role,
        page=page, limit=limit,
    )


@router.get("/{contract_id}", response_model=ContractDetail)
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await contract_service.get_contract_detail(db, contract_id, current_user.id)


@router.post("/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = await contract_service.sign_contract(db, contract_id, current_user.id)
    await db.flush()
    return ContractResponse.model_validate(contract)


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
