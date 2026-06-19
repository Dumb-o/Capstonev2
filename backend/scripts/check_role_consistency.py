"""
Check for existing role/wallet consistency issues before deploying
the "One Wallet = One Role = One Account" enforcement.

Run: python -m scripts.check_role_consistency

This is a read-only check. No data is modified.
"""
import asyncio
from collections import defaultdict

from sqlalchemy import select

from app.database import async_session_factory
from app.models.models import User, UserRole


async def check():
    async with async_session_factory() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()

    print(f"\n=== Role Consistency Report ===\n")
    print(f"Total users: {len(users)}\n")

    wallet_map = defaultdict(list)

    for u in users:
        if u.wallet_address:
            wallet_map[u.wallet_address.lower()].append(u)

    issues = 0

    print("--- Wallet Uniqueness Check ---")
    for addr, dups in wallet_map.items():
        if len(dups) > 1:
            issues += 1
            print(f"  CONFLICT: Wallet {addr} is linked to {len(dups)} users:")
            for d in dups:
                print(f"    - {d.id} (role={d.role.value}, auth={d.auth_method})")

    if not any(len(v) > 1 for v in wallet_map.values()):
        print("  All wallet addresses are unique — no conflicts.\n")

    print("--- Role Distribution ---")
    for role in UserRole:
        count = sum(1 for u in users if u.role == role)
        print(f"  {role.value}: {count}")

    print(f"\n--- Summary ---")
    if issues:
        print(f"  WARNING: {issues} wallet conflict(s) found. Resolve before deploying.")
    else:
        print(f"  No wallet conflicts found. Safe to deploy one-wallet-one-role enforcement.")


if __name__ == "__main__":
    asyncio.run(check())
