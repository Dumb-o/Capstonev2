"""
FreeLedger — Seed data script

Creates test users (clients, freelancers, admin), sample jobs, and proposals.
Run: PYTHONPATH=backend backend/venv/bin/python .wip/seed_data.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from datetime import datetime, timedelta, timezone

from app.database import async_session_factory, init_db
from app.models.models import User, AuthMethod, UserRole, AdminAccount, Job, Proposal
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

        # ── Clients ──────────────────────────────────────────────────────────
        alice = User(
            email="alice@test.com",
            password_hash=hash_password("client123"),
            auth_method=AuthMethod.email,
            username="Alice Client",
            role=UserRole.client,
            bio="Experienced product manager launching Web3 platforms. Looking for reliable blockchain devs and designers.",
            skills=["Solidity", "React", "Python", "Product Management"],
        )
        db.add(alice)

        charlie = User(
            email="charlie@test.com",
            password_hash=hash_password("client123"),
            auth_method=AuthMethod.email,
            username="Charlie Capital",
            role=UserRole.client,
            bio="VC-backed DeFi startup hiring for our MVP launch. Fast-paced team, competitive ETH compensation.",
            skills=["Solidity", "Rust", "TypeScript", "Business Development"],
        )
        db.add(charlie)
        print("  Created clients: alice@test.com, charlie@test.com / client123")

        # ── Freelancers ──────────────────────────────────────────────────────
        bob = User(
            email="bob@test.com",
            password_hash=hash_password("freelancer123"),
            auth_method=AuthMethod.email,
            username="Bob Freelancer",
            role=UserRole.freelancer,
            bio="Full-stack blockchain developer with 5 years of Solidity experience. Built 3 DeFi protocols from scratch.",
            skills=["Solidity", "Web3", "React", "Node.js", "Hardhat"],
            hourly_rate=0.08,
            headline="Full-Stack Blockchain Developer",
            experience_level="senior",
            industries=["DeFi", "NFTs"],
            is_available=True,
        )
        db.add(bob)

        diana = User(
            email="diana@test.com",
            password_hash=hash_password("freelancer123"),
            auth_method=AuthMethod.email,
            username="Diana UI",
            role=UserRole.freelancer,
            bio="UI/UX designer specializing in Web3 interfaces. Previously designed for Uniswap and OpenSea.",
            skills=["Figma", "React", "Tailwind", "User Research"],
            hourly_rate=0.06,
            headline="Web3 UI/UX Designer",
            experience_level="senior",
            industries=["NFTs", "DeFi"],
            is_available=True,
        )
        db.add(diana)

        elena = User(
            email="elena@test.com",
            password_hash=hash_password("freelancer123"),
            auth_method=AuthMethod.email,
            username="Elena Secure",
            role=UserRole.freelancer,
            bio="Smart contract security researcher. Found critical vulns in 10+ production contracts. OpenZeppelin contributor.",
            skills=["Solidity", "Security", "Rust", "Foundry"],
            hourly_rate=0.12,
            headline="Smart Contract Security Researcher",
            experience_level="lead",
            industries=["Security", "DeFi"],
            is_available=True,
        )
        db.add(elena)

        frank = User(
            email="frank@test.com",
            password_hash=hash_password("freelancer123"),
            auth_method=AuthMethod.email,
            username="Frank Backend",
            role=UserRole.freelancer,
            bio="Backend & infra engineer. Python, FastAPI, Postgres, Docker. Built scalable APIs used by 50k+ users.",
            skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
            hourly_rate=0.05,
            headline="Backend & Infrastructure Engineer",
            experience_level="senior",
            industries=["DeFi", "Infrastructure"],
            is_available=False,
        )
        db.add(frank)
        print("  Created freelancers: bob@test.com, diana@test.com, elena@test.com, frank@test.com / freelancer123")

        # ── Admin ────────────────────────────────────────────────────────────
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
        print("  Created admin: admin@test.com / admin123")

        # ── Jobs ─────────────────────────────────────────────────────────────
        now = datetime.now(timezone.utc)

        jobs_data = [
            # Alice's open jobs
            dict(
                client_id=alice.id,
                title="Build a DeFi Dashboard",
                description="Need a Solidity + React developer to build a real-time DeFi portfolio dashboard that tracks positions across Uniswap, Aave, and Compound. Must integrate subgraph queries, display historical APY charts, and support wallet connect via WalletConnect v2. Previous dashboard experience strongly preferred.",
                budget=5.0,
                category="blockchain",
                skills=["Solidity", "React", "Web3", "GraphQL"],
                duration_days=30,
                status="open",
                created_at=now - timedelta(days=7),
            ),
            dict(
                client_id=alice.id,
                title="Smart Contract Security Audit",
                description="Audit our NFT marketplace smart contracts (~2,800 LOC) for common vulnerability classes: reentrancy, oracle manipulation, signature replay, and access control issues. Deliver a detailed findings report with PoCs and remediation recommendations. Previous audit experience and samples required.",
                budget=3.5,
                category="security",
                skills=["Solidity", "Security"],
                duration_days=14,
                status="open",
                created_at=now - timedelta(days=5),
            ),
            dict(
                client_id=alice.id,
                title="Design NFT Marketplace Landing Page",
                description="Design a high-converting landing page for our NFT marketplace launch. Need hero section, featured collections grid, stats bar, and CTA. Must match dark theme with neon accents. Deliver in Figma with a clickable prototype and design system specs.",
                budget=1.5,
                category="design",
                skills=["Figma", "UI Design", "Prototyping"],
                duration_days=10,
                status="open",
                created_at=now - timedelta(days=3),
            ),
            # Charlie's open jobs
            dict(
                client_id=charlie.id,
                title="Full Stack dApp Development",
                description="Build a complete decentralized application for our lending protocol. The frontend is React + wagmi + RainbowKit; the backend uses Solidity smart contracts with Foundry for testing. IPFS integration for storing loan metadata. This is our core MVP — quality and speed both matter.",
                budget=8.0,
                category="blockchain",
                skills=["React", "Solidity", "IPFS", "Node.js", "Foundry"],
                duration_days=45,
                status="open",
                created_at=now - timedelta(days=2),
            ),
            dict(
                client_id=charlie.id,
                title="Web3 Frontend Integration",
                description="Integrate Web3 wallet connection, approval flows, and transaction signing into our existing React dashboard. Use ethers.js + Web3Modal. Must handle all edge cases: chain switching, insufficient gas, rejected transactions, and mobile wallets.",
                budget=2.5,
                category="frontend",
                skills=["React", "Web3", "ethers.js", "TypeScript"],
                duration_days=21,
                status="open",
                created_at=now - timedelta(days=1),
            ),
            dict(
                client_id=charlie.id,
                title="Deploy and Test Smart Contracts",
                description="Deploy our lending-pool smart contracts to Goerli testnet and write comprehensive integration tests using Hardhat + Chai. Need test coverage for: deposit, withdraw, borrow, liquidate, and view functions. Also write a deployment script with verify.",
                budget=4.0,
                category="blockchain",
                skills=["Solidity", "Hardhat", "TypeScript"],
                duration_days=10,
                status="open",
                created_at=now - timedelta(days=1),
            ),
            dict(
                client_id=charlie.id,
                title="Build REST API for User Analytics",
                description="Design and build a REST API for user analytics dashboard using FastAPI + PostgreSQL. Must support filtering by date range, cohort analysis, retention metrics, and CSV export. Need OpenAPI docs and Docker Compose for local dev.",
                budget=3.0,
                category="backend",
                skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
                duration_days=21,
                status="open",
                created_at=now - timedelta(days=4),
            ),
            # In-progress jobs (alice has awarded these)
            dict(
                client_id=alice.id,
                title="Write Solidity Unit Tests",
                description="Write comprehensive unit tests for our vault contract using Hardhat. Target 95%+ branch coverage. Include fuzz testing for edge cases in deposit/withdraw math.",
                budget=2.0,
                category="blockchain",
                skills=["Solidity", "Hardhat", "JavaScript"],
                duration_days=14,
                status="in_progress",
                created_at=now - timedelta(days=20),
            ),
        ]

        for jd in jobs_data:
            job = Job(**jd)
            db.add(job)
        await db.flush()
        print(f"  Created {len(jobs_data)} jobs")

        # ── Proposals ────────────────────────────────────────────────────────
        open_jobs = await db.execute(
            __import__('sqlalchemy').select(Job).where(Job.status == "open")
        )
        open_jobs = open_jobs.scalars().all()

        proposals_data = [
            # Bob proposes on DeFi Dashboard
            dict(
                freelancer_id=bob.id,
                job_id=open_jobs[0].id,
                cover_letter="I've built 3 DeFi dashboards from scratch, including one that tracked 15+ protocols simultaneously. I'm confident I can deliver this in 3 weeks. Here's my approach: wire up subgraphs first for on-chain data, then build the React frontend with Recharts for APY charts.",
                bid_amount=4.5,
                status="pending",
            ),
            # Elena proposes on Security Audit
            dict(
                freelancer_id=elena.id,
                job_id=open_jobs[1].id,
                cover_letter="I've found critical vulnerabilities in 10+ production contracts including a $2M exploit in a lending protocol. I'll apply my custom Foundry fuzzing suite to your NFT marketplace contracts. Sample audit report available on request.",
                bid_amount=3.2,
                status="pending",
            ),
            # Diana proposes on Design Landing Page
            dict(
                freelancer_id=diana.id,
                job_id=open_jobs[2].id,
                cover_letter="Dark theme with neon accents is exactly my specialty. I designed the Uniswap V3 LP interface and the OpenSea collection pages. I'll deliver a full Figma design system with dark/light modes and responsive breakpoints.",
                bid_amount=1.5,
                status="pending",
            ),
            # Bob proposes on Full Stack dApp
            dict(
                freelancer_id=bob.id,
                job_id=open_jobs[3].id,
                cover_letter="This sounds like exactly the kind of project I excel at. I've built 2 lending protocols on Ethereum mainnet and know the Foundry + wagmi + RainbowKit stack well. I can start immediately and commit to a 6-week delivery timeline.",
                bid_amount=7.5,
                status="pending",
            ),
            # Frank proposes on REST API
            dict(
                freelancer_id=frank.id,
                job_id=open_jobs[6].id,
                cover_letter="I built the analytics API at my previous company that handled 10M+ events/day. FastAPI + PostgreSQL + Redis is my sweet spot. I'll deliver a fully typed API with auto-generated OpenAPI docs and Docker Compose setup included.",
                bid_amount=2.8,
                status="pending",
            ),
        ]

        for pd in proposals_data:
            proposal = Proposal(**pd)
            db.add(proposal)
        print(f"  Created {len(proposals_data)} proposals")

        await db.commit()
        print("\n✅ Seed complete! Login credentials:")
        print("   Clients:     alice@test.com / client123")
        print("               charlie@test.com / client123")
        print("   Freelancers: bob@test.com     / freelancer123")
        print("               diana@test.com   / freelancer123")
        print("               elena@test.com   / freelancer123")
        print("               frank@test.com   / freelancer123")
        print("   Admin:       admin@test.com   / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
