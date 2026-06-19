"""
Reset wallet-based development users.

Removes pre-seeded or all wallet-auth users in local development, while
safely detaching dependent records that would otherwise block deletion.

Run:
  python -m scripts.reset_wallets

Behavior:
- Removes users whose auth_method == wallet AND wallet_address matches either:
    * 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  (client)
    * 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  (freelancer)
- If ALLOW_ALL_WALLET_RESET=true is set in the environment, removes ALL users
  with auth_method == wallet.

Safety:
- Sets jobs.client_id to NULL when the referenced user is being deleted so
  foreign key constraints do not abort the transaction.
"""

import asyncio
import os

from sqlalchemy import delete, text

from app.database import async_session_factory
from app.models.models import User


DEFAULT_WALLETS = [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffbb92266",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
]


async def reset() -> int:
    async with async_session_factory() as db:
        if os.getenv("ALLOW_ALL_WALLET_RESET", "").lower() in ("1", "true", "yes"):
            result = await db.execute(text("SELECT id FROM users WHERE auth_method = 'wallet'"))
            title = "all wallet-based users"
        else:
            wallets = [w.lower() for w in DEFAULT_WALLETS]
            sql = text(
                "SELECT id FROM users WHERE auth_method = 'wallet' AND lower(wallet_address) = ANY(:wallets)"
            ).bindparams(wallets=wallets)
            result = await db.execute(sql)
            title = "default local-dev wallets"

        rows = result.fetchall()
        user_ids = [r[0] for r in rows]

        if not user_ids:
            return 0, title

        # Detach dependent jobs to avoid FK violation
        await db.execute(
            text("UPDATE jobs SET client_id = NULL WHERE client_id = ANY(:ids)").bindparams(ids=user_ids)
        )

        # Delete wallet users
        del_result = await db.execute(delete(User).where(User.id.in_(user_ids)))
        await db.commit()
        return (del_result.rowcount or 0), title


def main() -> None:
    try:
        count, title = asyncio.run(reset())
    except Exception as e:
        print(f"Reset failed: {e}")
        raise SystemExit(1)

    print(f"\n=== Wallet Reset Complete ===\n")
    print(f"  Removed {count} {title}\n")

    if os.getenv("ALLOW_ALL_WALLET_RESET", "").lower() in ("1", "true", "yes"):
        print("  Mode: ALL wallet users deleted.")
    else:
        print("  Mode: targeted local development wallets deleted.")
        print("  Use ALLOW_ALL_WALLET_RESET=true to wipe all wallet users.\n")

    print("  Next: register 2 new wallets through the app UI (MetaMask signup).\n")


if __name__ == "__main__":
    main()
