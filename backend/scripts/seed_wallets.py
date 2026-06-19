"""
Seed dedicated wallet users for local development.

Pre-creates two wallet-based user accounts so that developers can
connect MetaMask and log in immediately without manual registration:

  Client Wallet     (Hardhat #0) → Account with role=client
  Freelancer Wallet (Hardhat #1) → Account with role=freelancer

Run: python -m scripts.seed_wallets
"""
import asyncio

from sqlalchemy import select

from app.database import async_session_factory
from app.models.models import AuthMethod, User, UserRole

CLIENT_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffbb92266"
FREELANCER_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"


async def seed():
    async with async_session_factory() as db:
        created = []

        for wallet, role, label in [
            (CLIENT_WALLET, UserRole.client, "Client"),
            (FREELANCER_WALLET, UserRole.freelancer, "Freelancer"),
        ]:
            result = await db.execute(
                select(User).where(User.wallet_address == wallet)
            )
            user = result.scalar_one_or_none()

            if user:
                print(f"  {label}: user already exists (id={user.id[:16]}..., role={user.role.value})")
                if user.role != role:
                    print(f"    WARNING: expected role={role.value}, got {user.role.value}")
                continue

            user = User(
                wallet_address=wallet,
                username=f"{label.lower()}_dev",
                role=role,
                auth_method=AuthMethod.wallet.value,
                headline=f"Development {label} Account",
                bio=f"Pre-seeded {label.lower()} wallet for local development and testing.",
                is_active=True,
            )
            db.add(user)
            await db.flush()
            created.append((label, user.id))

        await db.commit()

    print(f"\n=== Wallet Seed Complete ===\n")
    if created:
        for label, uid in created:
            print(f"  Created {label}: user_id={uid[:16]}...")
    else:
        print("  No new users created (both wallets already registered).")

    print(f"\n  Client Wallet:     {CLIENT_WALLET}")
    print(f"  Freelancer Wallet: {FREELANCER_WALLET}")
    print()
    print("  Next step: Connect the appropriate MetaMask wallet and log in.")
    print("  The role is already assigned — no role selection needed.")


if __name__ == "__main__":
    asyncio.run(seed())
