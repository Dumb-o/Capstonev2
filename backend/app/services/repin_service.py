import asyncio
import logging

from sqlalchemy import select

from app.database import async_session_factory
from app.models.models import Contract, Proposal
from app.services.ipfs_service import pin_file

logger = logging.getLogger("freeledger.repin_service")

REPIN_INTERVAL_SECONDS = 21600  # 6 hours


async def _collect_cids() -> set[str]:
    """Collect every CID stored in the database (terms_cid, deliverable_cid,
    avatar_cid, portfolio_cids)."""
    cids: set[str] = set()

    async with async_session_factory() as db:
        result = await db.execute(select(Contract.terms_cid))
        for row in result.scalars():
            if row:
                cids.add(row)

        result = await db.execute(
            select(Contract.__table__.c.id).where(Contract.on_chain_id.isnot(None))
        )

        from sqlalchemy import text
        rows = await db.execute(text(
            "SELECT deliverable_cid FROM contract_milestones WHERE deliverable_cid IS NOT NULL"
        ))
        for row in rows:
            if row[0]:
                cids.add(row[0])

        rows = await db.execute(text(
            "SELECT avatar_cid FROM users WHERE avatar_cid IS NOT NULL"
        ))
        for row in rows:
            if row[0]:
                cids.add(row[0])

        rows = await db.execute(text(
            "SELECT portfolio_cids FROM users WHERE portfolio_cids IS NOT NULL"
        ))
        for row in rows:
            if row[0]:
                import json
                try:
                    for c in json.loads(row[0]):
                        if c:
                            cids.add(c)
                except (json.JSONDecodeError, TypeError):
                    pass

    return cids


async def repin_loop():
    logger.info("IPFS repin service started (interval=%ss)", REPIN_INTERVAL_SECONDS)
    while True:
        try:
            cids = await _collect_cids()
            logger.info("Repinning %d CIDs", len(cids))
            for cid in cids:
                try:
                    ok = await pin_file(cid)
                    if ok:
                        logger.debug("Repinned %s", cid)
                    else:
                        logger.warning("Failed to repin %s", cid)
                except Exception:
                    logger.exception("Error repinning %s", cid)
        except Exception:
            logger.exception("Repin collection failed")

        await asyncio.sleep(REPIN_INTERVAL_SECONDS)


def start_repin_service():
    asyncio.create_task(repin_loop())
