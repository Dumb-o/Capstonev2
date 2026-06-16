import asyncio
import json
import logging

from web3 import Web3
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.models import Contract, ContractMilestone, Dispute, ContractStatus, MilestoneStatus, DisputeStatus
from app.services.blockchain_service import get_web3, get_contract

logger = logging.getLogger("freeledger.event_listener")

POLL_INTERVAL = 5
START_BLOCK_KEY = "event_listener:last_processed_block"
event_listener_running = False


def _load_contract_abi() -> dict:
    import os
    abi_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "GigEscrow.json")
    with open(abi_path) as f:
        return json.load(f)


async def _get_last_block(redis) -> int:
    val = await redis.get(START_BLOCK_KEY)
    return int(val) if val else 0


async def _set_last_block(redis, block_num: int):
    await redis.set(START_BLOCK_KEY, block_num)


async def _get_or_create_redis():
    from app.redis_client import get_redis
    return await get_redis()


async def process_milestone_approved(contract_on_chain_id: int, milestone_index: int, db):
    result = await db.execute(
        select(Contract).where(Contract.on_chain_id == contract_on_chain_id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        logger.warning("No contract found for on_chain_id %s", contract_on_chain_id)
        return

    ms_result = await db.execute(
        select(ContractMilestone).where(
            ContractMilestone.contract_id == contract.id,
            ContractMilestone.index == milestone_index,
        )
    )
    milestone = ms_result.scalar_one_or_none()
    if milestone and milestone.status != MilestoneStatus.paid:
        milestone.status = MilestoneStatus.paid
        logger.info("Milestone %s/%s marked as paid", contract.id, milestone_index)

    all_ms = await db.execute(
        select(ContractMilestone).where(ContractMilestone.contract_id == contract.id)
    )
    all_milestones = all_ms.scalars().all()
    if all(m.status == MilestoneStatus.paid for m in all_milestones):
        contract.status = ContractStatus.completed
        logger.info("Contract %s completed (all milestones paid)", contract.id)


async def process_dispute_raised(contract_on_chain_id: int, db):
    result = await db.execute(
        select(Contract).where(Contract.on_chain_id == contract_on_chain_id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        logger.warning("No contract found for on_chain_id %s", contract_on_chain_id)
        return

    contract.status = ContractStatus.disputed
    logger.info("Contract %s marked as disputed (on-chain event)", contract.id)


async def process_dispute_resolved(contract_on_chain_id: int, db):
    result = await db.execute(
        select(Contract).where(Contract.on_chain_id == contract_on_chain_id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        logger.warning("No contract found for on_chain_id %s", contract_on_chain_id)
        return

    dispute_result = await db.execute(
        select(Dispute).where(Dispute.contract_id == contract.id)
    )
    dispute = dispute_result.scalar_one_or_none()
    if dispute and dispute.status != DisputeStatus.resolved:
        dispute.status = DisputeStatus.resolved
        logger.info("Dispute for contract %s marked as resolved (on-chain event)", contract.id)


async def poll_events():
    global event_listener_running
    logger.info("Blockchain event listener started")
    event_listener_running = True

    while True:
        try:
            redis = await _get_or_create_redis()
            if not redis:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            last_block = await _get_last_block(redis)
            w3 = get_web3()
            current_block = w3.eth.block_number

            if current_block <= last_block:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            contract = get_contract()
            from_block = last_block + 1

            milestone_approved_events = contract.events.MilestoneApproved.get_logs(
                from_block=from_block, to_block=current_block
            )
            dispute_raised_events = contract.events.DisputeRaised.get_logs(
                from_block=from_block, to_block=current_block
            )
            dispute_resolved_events = contract.events.DisputeResolved.get_logs(
                from_block=from_block, to_block=current_block
            )

            if milestone_approved_events or dispute_raised_events or dispute_resolved_events:
                async with async_session_factory() as db:
                    try:
                        for evt in milestone_approved_events:
                            args = evt["args"]
                            await process_milestone_approved(
                                args["contractId"], args["milestoneIndex"], db
                            )

                        for evt in dispute_raised_events:
                            args = evt["args"]
                            await process_dispute_raised(args["contractId"], db)

                        for evt in dispute_resolved_events:
                            args = evt["args"]
                            await process_dispute_resolved(args["contractId"], db)

                        await db.commit()
                    except Exception:
                        await db.rollback()
                        raise

            await _set_last_block(redis, current_block)

        except Exception as e:
            logger.error("Event listener error: %s", str(e), exc_info=True)

        await asyncio.sleep(POLL_INTERVAL)


def start_event_listener():
    asyncio.create_task(poll_events())
