import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.models import Contract, ContractMilestone, ContractStatus, MilestoneStatus, User
from app.schemas.schemas import (
    ContractCreate,
    ContractDetail,
    ContractResponse,
    DisputeResponse,
    MilestoneResponse,
)
from app.services import ipfs_service
from app.services.blockchain_service import (
    approve_milestone_on_chain,
    create_contract_on_chain,
    fund_contract_on_chain,
    submit_milestone_on_chain,
    to_wei,
)
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.utils.helpers import pagination_params

# =============================================================================
# KEY RESOLUTION — Which key signs what (see MB-006 / security.md)
# =============================================================================
# create_contract:    private_key param > CLIENT_PRIVATE_KEY
# fund_contract:      private_key param > CLIENT_PRIVATE_KEY
# submit_milestone:   private_key param > FREELANCER_PRIVATE_KEY > CLIENT_PRIVATE_KEY
# approve_milestone:  private_key param > CLIENT_PRIVATE_KEY
# reject_milestone:   no on-chain action (database only)
#
# WARNING: CLIENT_PRIVATE_KEY is the ultimate fallback for ALL on-chain
# operations. This is a single point of failure. See MB-006.
# =============================================================================


async def create_contract(
    db: AsyncSession,
    data: ContractCreate,
    client_id: str,
    client_wallet: str,
    private_key: str | None = None,
) -> Contract:
    terms = {
        "title": data.title,
        "description": data.description,
        "total_amount": data.total_amount,
        "deadline": data.deadline.isoformat() if data.deadline else None,
        "milestones": [m.model_dump() for m in data.milestones],
    }

    terms_json = json.dumps(terms).encode()
    ipfs_result = await ipfs_service.upload_file_bytes(terms_json, f"contract_{client_id}.json")
    terms_cid = ipfs_result["cid"]

    contract = Contract(
        job_id=data.job_id,
        client_id=client_id,
        freelancer_id=data.freelancer_id,
        title=data.title,
        description=data.description,
        total_amount=data.total_amount,
        deadline=data.deadline,
        terms_cid=terms_cid,
        status=ContractStatus.pending_signatures if data.freelancer_id else ContractStatus.draft,
    )
    db.add(contract)
    await db.flush()

    for i, m in enumerate(data.milestones):
        milestone = ContractMilestone(
            contract_id=contract.id,
            index=i,
            description=m.description,
            amount=m.amount,
            due_date=m.due_date,
            status=MilestoneStatus.pending,
        )
        db.add(milestone)

    await db.flush()

    if data.freelancer_id:
        pk = private_key or settings.client_private_key
        if not pk:
            raise ValidationError(
                "No private key configured for on-chain contract creation. "
                "Set CLIENT_PRIVATE_KEY in environment.",
                code=ErrorCodes.VALIDATION_NO_KEY,
            )
        freelancer = await db.get(User, data.freelancer_id)
        if freelancer:
            on_chain = await create_contract_on_chain(
                freelancer_address=freelancer.wallet_address,
                title=data.title,
                terms_cid=terms_cid,
                total_amount_wei=to_wei(data.total_amount),
                deadline=int(data.deadline.timestamp()) if data.deadline else 0,
                milestone_descs=[m.description for m in data.milestones],
                milestone_amounts=[to_wei(m.amount) for m in data.milestones],
                client_private_key=pk,
            )
            contract.on_chain_id = on_chain["on_chain_id"]
            contract.contract_address = on_chain["contract_address"]

    return contract


async def get_contracts(
    db: AsyncSession,
    user_id: str,
    status: str | None = None,
    role: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    query = select(Contract).where(
        (Contract.client_id == user_id) | (Contract.freelancer_id == user_id)
    )

    if status:
        query = query.where(Contract.status == ContractStatus(status))
    if role == "client":
        query = query.where(Contract.client_id == user_id)
    elif role == "freelancer":
        query = query.where(Contract.freelancer_id == user_id)

    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(Contract.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    contracts = result.scalars().all()

    return {
        "contracts": [ContractResponse.model_validate(c) for c in contracts],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
    }


async def get_contract_detail(db: AsyncSession, contract_id: str, user_id: str) -> ContractDetail:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != user_id and contract.freelancer_id != user_id:
        raise AuthorizationError("Not a party to this contract", code=ErrorCodes.AUTHZ_CONTRACT_PARTY)

    milestones_query = select(ContractMilestone).where(
        ContractMilestone.contract_id == contract_id
    ).order_by(ContractMilestone.index)
    milestones_result = await db.execute(milestones_query)
    milestones = milestones_result.scalars().all()

    dispute = None
    if contract.dispute:
        dispute = DisputeResponse.model_validate(contract.dispute)

    return ContractDetail(
        contract=ContractResponse.model_validate(contract),
        milestones=[MilestoneResponse.model_validate(m) for m in milestones],
        dispute=dispute,
    )


async def sign_contract(db: AsyncSession, contract_id: str, user_id: str) -> Contract:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)

    if contract.client_id == user_id:
        if contract.client_signed:
            raise ValidationError("Already signed by client", code=ErrorCodes.VALIDATION_ALREADY_SIGNED)
        contract.client_signed = True
    elif contract.freelancer_id == user_id:
        if contract.freelancer_signed:
            raise ValidationError("Already signed by freelancer", code=ErrorCodes.VALIDATION_ALREADY_SIGNED)
        contract.freelancer_signed = True
    else:
        raise AuthorizationError("Not a party to this contract", code=ErrorCodes.AUTHZ_CONTRACT_PARTY)

    if contract.client_signed and contract.freelancer_signed:
        contract.status = ContractStatus.pending_funding

    return contract


async def fund_contract(
    db: AsyncSession,
    contract_id: str,
    user_id: str,
    private_key: str | None = None,
) -> Contract:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != user_id:
        raise AuthorizationError("Only the client can fund the contract", code=ErrorCodes.AUTHZ_CLIENT_FUND)
    if contract.status != ContractStatus.pending_funding:
        raise ValidationError("Contract is not awaiting funding", code=ErrorCodes.VALIDATION_NOT_AWAITING_FUNDING)
    if contract.on_chain_id is None:
        raise ValidationError("Contract has no on-chain binding", code=ErrorCodes.VALIDATION_NO_ONCHAIN_ID)

    pk = private_key or settings.client_private_key
    if not pk:
        raise ValidationError("No private key configured for on-chain funding", code=ErrorCodes.VALIDATION_NO_KEY)

    await fund_contract_on_chain(
        contract_id=contract.on_chain_id,
        amount_wei=to_wei(contract.total_amount),
        client_private_key=pk,
    )
    contract.status = ContractStatus.active
    return contract


async def get_milestones(db: AsyncSession, contract_id: str, user_id: str) -> list[MilestoneResponse]:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != user_id and contract.freelancer_id != user_id:
        raise AuthorizationError("Not a party to this contract", code=ErrorCodes.AUTHZ_CONTRACT_PARTY)

    result = await db.execute(
        select(ContractMilestone).where(ContractMilestone.contract_id == contract_id)
        .order_by(ContractMilestone.index)
    )
    milestones = result.scalars().all()
    return [MilestoneResponse.model_validate(m) for m in milestones]


async def submit_milestone(
    db: AsyncSession,
    contract_id: str,
    milestone_index: int,
    deliverable_cid: str,
    notes: str | None,
    user_id: str,
    private_key: str | None = None,
) -> ContractMilestone:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.freelancer_id != user_id:
        raise AuthorizationError("Only the freelancer can submit milestones", code=ErrorCodes.AUTHZ_FREELANCER_SUBMIT)
    if contract.status != ContractStatus.active:
        raise ValidationError("Contract is not active", code=ErrorCodes.VALIDATION_NOT_ACTIVE)

    result = await db.execute(
        select(ContractMilestone).where(
            ContractMilestone.contract_id == contract_id,
            ContractMilestone.index == milestone_index,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise NotFoundError("Milestone not found", code=ErrorCodes.NOT_FOUND_MILESTONE)
    if milestone.status != MilestoneStatus.pending:
        raise ValidationError("Milestone already submitted", code=ErrorCodes.VALIDATION_ALREADY_SUBMITTED)

    milestone.deliverable_cid = deliverable_cid
    milestone.submission_notes = notes
    milestone.status = MilestoneStatus.submitted
    milestone.submitted_at = datetime.now(timezone.utc)

    pk = private_key or settings.freelancer_private_key or settings.client_private_key
    if pk and contract.on_chain_id is not None:
        await submit_milestone_on_chain(
            contract_id=contract.on_chain_id,
            milestone_index=milestone_index,
            deliverable_cid=deliverable_cid,
            freelancer_private_key=pk,
        )

    return milestone


async def approve_milestone(
    db: AsyncSession,
    contract_id: str,
    milestone_index: int,
    user_id: str,
    private_key: str | None = None,
) -> dict:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != user_id:
        raise AuthorizationError("Only the client can approve milestones", code=ErrorCodes.AUTHZ_CLIENT_ACTION)
    if contract.status != ContractStatus.active:
        raise ValidationError("Contract is not active", code=ErrorCodes.VALIDATION_NOT_ACTIVE)

    result = await db.execute(
        select(ContractMilestone).where(
            ContractMilestone.contract_id == contract_id,
            ContractMilestone.index == milestone_index,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise NotFoundError("Milestone not found", code=ErrorCodes.NOT_FOUND_MILESTONE)
    if milestone.status != MilestoneStatus.submitted:
        raise ValidationError("Milestone has not been submitted", code=ErrorCodes.VALIDATION_NOT_SUBMITTED)

    milestone.status = MilestoneStatus.approved
    milestone.approved_at = datetime.now(timezone.utc)

    pk = private_key or settings.client_private_key
    tx_hash = None
    if pk and contract.on_chain_id is not None:
        tx_hash = await approve_milestone_on_chain(
            contract_id=contract.on_chain_id,
            milestone_index=milestone_index,
            client_private_key=pk,
        )

    all_milestones = await db.execute(
        select(ContractMilestone).where(
            ContractMilestone.contract_id == contract_id
        )
    )
    all_ms = all_milestones.scalars().all()
    if all(m.status == MilestoneStatus.approved or m.status == MilestoneStatus.paid for m in all_ms):
        contract.status = ContractStatus.completed

    return {
        "milestone": MilestoneResponse.model_validate(milestone),
        "tx_hash": tx_hash,
    }


async def reject_milestone(
    db: AsyncSession,
    contract_id: str,
    milestone_index: int,
    reason: str,
    user_id: str,
) -> ContractMilestone:
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise NotFoundError("Contract not found", code=ErrorCodes.NOT_FOUND_CONTRACT)
    if contract.client_id != user_id:
        raise AuthorizationError("Only the client can reject milestones", code=ErrorCodes.AUTHZ_CLIENT_ACTION)

    result = await db.execute(
        select(ContractMilestone).where(
            ContractMilestone.contract_id == contract_id,
            ContractMilestone.index == milestone_index,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise NotFoundError("Milestone not found", code=ErrorCodes.NOT_FOUND_MILESTONE)
    if milestone.status != MilestoneStatus.submitted:
        raise ValidationError("Milestone has not been submitted", code=ErrorCodes.VALIDATION_NOT_SUBMITTED)

    milestone.deliverable_cid = None
    milestone.submission_notes = None
    milestone.status = MilestoneStatus.pending
    milestone.submitted_at = None

    return milestone
