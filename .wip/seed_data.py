"""
FreeLedger — Seed data script

Creates test users (client, freelancer, admin) and sample jobs.
Run: PYTHONPATH=backend backend/venv/bin/python .wip/seed_data.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import async_session_factory, init_db
from app.models.models import User, AuthMethod, UserRole, AdminAccount
from app.services.auth_service import hash_password


async def seed():
    await init_db()
    async with async_session_factory() as db:
        existing = await db.execute(
            __import__('sqlalchemy').select(User).where(User.email == 'alice@test.com')
        )
        if existing.scalar_one_or_none():
            print("Seed data already exists, skipping.")
            return

        client = User(
            email="alice@test.com",
            password_hash=hash_password("client123"),
            auth_method=AuthMethod.email,
            username="Alice Client",
            role=UserRole.client,
            bio="Experienced project manager looking for blockchain devs",
            skills=["Solidity", "React", "Python"],
        )
        db.add(client)
        print(f"Created client: alice@test.com / client123")

        freelancer = User(
            email="bob@test.com",
            password_hash=hash_password("freelancer123"),
            auth_method=AuthMethod.email,
            username="Bob Freelancer",
            role=UserRole.freelancer,
            bio="Full-stack blockchain developer",
            skills=["Solidity", "Web3", "React", "Node.js"],
            hourly_rate=0.05,
        )
        db.add(freelancer)
        print(f"Created freelancer: bob@test.com / freelancer123")

        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("admin123"),
            auth_method=AuthMethod.email,
            username="Admin User",
            role=UserRole.admin,
        )
        db.add(admin_user)
        await db.flush()

        admin_acc = AdminAccount(user_id=admin_user.id, role="admin")
        db.add(admin_acc)
        print(f"Created admin: admin@test.com / admin123")

        from datetime import datetime, timedelta

        from app.models.models import Job
        from app.schemas.schemas import JobCreate

        jobs_data = [
            JobCreate(
                title="Build a DeFi Dashboard",
                description="Need a Solidity + React developer to build a real-time DeFi portfolio dashboard. Must integrate with Uniswap and Aave.",
                budget=5.0,
                category="blockchain",
                skills=["Solidity", "React", "Web3"],
                duration_days=30,
            ),
            JobCreate(
                title="Smart Contract Security Audit",
                description="Audit our NFT marketplace smart contracts for vulnerabilities. Previous experience with security audits required.",
                budget=3.5,
                category="security",
                skills=["Solidity", "Security"],
                duration_days=14,
            ),
            JobCreate(
                title="Full Stack dApp Development",
                description="Build a complete decentralized application with React frontend and Solidity backend. Includes IPFS integration for file storage.",
                budget=8.0,
                category="blockchain",
                skills=["React", "Solidity", "IPFS", "Node.js"],
                duration_days=45,
            ),
            JobCreate(
                title="Web3 Frontend Integration",
                description="Integrate Web3 wallet connection, transaction signing, and smart contract interaction into our existing React application.",
                budget=2.5,
                category="frontend",
                skills=["React", "Web3", "ethers.js"],
                duration_days=21,
            ),
            JobCreate(
                title="Deploy and Test Smart Contracts",
                description="Help deploy our testnet smart contracts and write comprehensive Hardhat tests. Need experience with Hardhat and Chai.",
                budget=4.0,
                category="blockchain",
                skills=["Solidity", "Hardhat", "JavaScript"],
                duration_days=10,
            ),
        ]

        for job_data in jobs_data:
            job = Job(
                client_id=client.id,
                title=job_data.title,
                description=job_data.description,
                budget=job_data.budget,
                category=job_data.category,
                skills=job_data.skills,
                duration_days=job_data.duration_days,
                status="open",
            )
            db.add(job)
            print(f"  Created job: {job_data.title} ({job_data.budget} ETH)")

        await db.commit()
        print("\n✅ Seed complete! Login credentials:")
        print("   Client:     alice@test.com / client123")
        print("   Freelancer: bob@test.com / freelancer123")
        print("   Admin:      admin@test.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
