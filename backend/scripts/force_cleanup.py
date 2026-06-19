"""
Force-clean dependent records, then remove wallet-auth users.

This is designed for local development resets only.

Run with:
  python -m scripts.force_cleanup
  ALLOW_ALL_WALLET_RESET=true python -m scripts.force_cleanup   # remove every wallet user
"""

import asyncio
import os
from contextlib import suppress

from sqlalchemy import delete, text

from app.database import async_session_factory
from app.models.models import User


DEFAULT_WALLETS = [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffbb92266",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
]


async def run() -> int:
    async with async_session_factory() as db:
        wallet_users = []
        if os.getenv("ALLOW_ALL_WALLET_RESET", "").lower() in ("1", "true", "yes"):
            wallet_users = (await db.execute(text("SELECT id FROM users WHERE auth_method = 'wallet'"))).scalars().all()
        else:
            wallets = [w.lower() for w in DEFAULT_WALLETS]
            wallet_users = (await db.execute(
                text("SELECT id FROM users WHERE auth_method = 'wallet' AND lower(wallet_address) = ANY(:wallets)")
            ).bindparams(wallets=wallets)).scalars().all()

        wallet_users = list(wallet_users)
        if not wallet_users:
            print("No wallet users selected for deletion.")
            return 0

        await db.execute(text("SET session_replication_role = 'replica'"))

        def q(sql, **kw):
            return db.execute(text(sql).bindparams(**kw)) if kw else db.execute(text(sql))

        print("Deleting dependent data...")
        await q("DELETE FROM disputes WHERE resolved_by = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM contract_milestones WHERE contract_id IN (SELECT id FROM contracts WHERE client_id = ANY(:ids) OR freelancer_id = ANY(:ids))", ids=wallet_users)
        await q("DELETE FROM messages WHERE sender_id = ANY(:ids) OR receiver_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM threads WHERE client_id = ANY(:ids) OR freelancer_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM proposals WHERE freelancer_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM contracts WHERE client_id = ANY(:ids) OR freelancer_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM jobs WHERE client_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM notifications WHERE user_id = ANY(:ids)", ids=wallet_users)
        await q("DELETE FROM admin_accounts WHERE user_id = ANY(:ids)", ids=wallet_users)

        print("Deleting wallet users...")
        res = await db.execute(delete(User).where(User.id.in_(wallet_users)))
        await db.commit()
        return res.rowcount or 0


def main() -> None:
    try:
        count = asyncio.run(run())
    except Exception as e:
        print(f"Force cleanup failed: {e}")
        raise SystemExit(1)
    print(f"\nRemoved {count} wallet user(s).")
    print("Next: register 2 wallets through the app MetaMask flow.\n")


if __name__ == "__main__":
    main()
