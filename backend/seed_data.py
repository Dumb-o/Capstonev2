"""
Seed script: creates 50 users, 30 jobs, 15 proposals, 5 contracts.
Uses SQLAlchemy for bulk user creation, API for jobs/proposals/contracts.
Run: docker cp seed_data.py freeledger-backend:/app/ && docker exec -i freeledger-backend python3 /app/seed_data.py
"""
import asyncio
import json
import random
import sys
import time
import urllib.request
import urllib.error

API = "http://localhost:8000/api"

def req(method, path, data=None, token=None):
    url = f"{API}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=30)
        return json.loads(resp.read().decode()) if resp.readable() else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        print(f"  ERROR {e.code} on {method} {path}: {detail[:200]}")
        return None
    except Exception as e:
        print(f"  EXCEPTION on {method} {path}: {e}")
        return None

async def create_users_directly():
    """Create 50 users via SQLAlchemy directly (bypasses API rate limits)."""
    sys.path.insert(0, "/app")
    from app.database import async_session_factory
    from app.models.models import User, UserRole
    from app.services.auth_service import hash_password

    FIRST_NAMES = [
        "Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah",
        "Ivan", "Julia", "Kevin", "Laura", "Michael", "Nina", "Oscar", "Patricia",
        "Quinn", "Rachel", "Samuel", "Tina", "Uma", "Victor", "Wendy", "Xavier",
        "Yvonne", "Zane", "Amelia", "Benjamin", "Catherine", "Daniel", "Eleanor",
        "Frank", "Grace", "Henry", "Isabella", "Jack", "Karen", "Liam", "Mia",
        "Noah", "Olivia", "Peter", "Quincy", "Rose", "Steven", "Tracy", "Ulysses",
        "Violet", "William"
    ]

    LAST_NAMES = [
        "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
        "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
        "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
        "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
        "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
        "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
        "Roberts"
    ]

    SKILLS_POOL = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Solidity",
        "Rust", "Go", "Java", "C++", "SQL", "AWS", "Docker", "Kubernetes",
        "GraphQL", "Vue.js", "Angular", "PostgreSQL", "MongoDB", "Redis",
        "Machine Learning", "Data Analysis", "UI/UX Design", "DevOps",
        "Smart Contracts", "Web3", "Ethereum", "IPFS", "CI/CD", "Security"
    ]

    CATEGORIES = [
        "web", "mobile", "blockchain", "design", "data", "devops", "security"
    ]

    async with async_session_factory() as db:
        from sqlalchemy import select
        existing = await db.execute(select(User.email).where(User.email.isnot(None)))
        existing_emails = {row[0] for row in existing if row[0]}
        print(f"Existing emails in DB: {len(existing_emails)}")

        users = {"clients": [], "freelancers": []}

        # Create 10 clients
        pw_hash = hash_password("test12345")
        for i in range(10):
            email = f"seed_client_{i}@test.com"
            if email in existing_emails:
                result = await db.execute(select(User).where(User.email == email))
                u = result.scalar_one_or_none()
                if u:
                    users["clients"].append(u.id)
                continue
            name = f"{FIRST_NAMES[i]} {LAST_NAMES[i]}"
            username = f"seedclient{i}"
            u = User(
                email=email, password_hash=pw_hash, auth_method="email",
                username=username, role=UserRole.client, is_active=True,
                headline=f"Client - {random.choice(CATEGORIES).title()}",
                bio=f"Experienced client looking for top freelancers.",
                industries=random.sample(CATEGORIES, k=min(3, len(CATEGORIES))),
            )
            db.add(u)
            await db.flush()
            users["clients"].append(u.id)
            print(f"  Created client: {name} ({u.id[:12]}...)")

        # Create 38 freelancers
        for i in range(38):
            email = f"seed_freelancer_{i}@test.com"
            if email in existing_emails:
                result = await db.execute(select(User).where(User.email == email))
                u = result.scalar_one_or_none()
                if u:
                    users["freelancers"].append(u.id)
                continue
            idx = (10 + i) % len(FIRST_NAMES)
            name = f"{FIRST_NAMES[idx]} {LAST_NAMES[idx]}"
            username = f"seedfreelancer{i}"
            skills = random.sample(SKILLS_POOL, k=random.randint(3, 6))
            exp_level = random.choice(["junior", "mid", "senior", "lead"])
            rate = round(random.uniform(0.01, 0.5), 3)
            u = User(
                email=email, password_hash=pw_hash, auth_method="email",
                username=username, role=UserRole.freelancer, is_active=True,
                headline=f"{exp_level.title()} {random.choice(skills)} Developer",
                bio=f"Freelancer with expertise in {', '.join(skills[:3])}.",
                skills=skills, hourly_rate=rate, experience_level=exp_level,
                industries=random.sample(CATEGORIES, k=random.randint(1, 4)),
                is_available=random.choice([True, True, True, False]),
            )
            db.add(u)
            await db.flush()
            users["freelancers"].append(u.id)
            print(f"  Created freelancer: {username} ({u.id[:12]}...)")

        await db.commit()
        return users

def main():
    print("=== FreeLedger Seed Data Generator ===\n")

    # Step 1: Create users via SQLAlchemy
    print("Step 1: Creating/loading users...")
    users = asyncio.run(create_users_directly())
    total_users = len(users["clients"]) + len(users["freelancers"])
    print(f"  Total: {total_users} ({len(users['clients'])} clients, {len(users['freelancers'])} freelancers)")

    if len(users["clients"]) < 3 or len(users["freelancers"]) < 3:
        print("ERROR: Not enough users. Aborting.")
        return

    # Step 2: Get admin token
    print("\nStep 2: Authenticating admin...")
    resp = req("POST", "/auth/email/login", {"email": "admin2@test.com", "password": "admin123"})
    if not resp:
        resp = req("POST", "/auth/email/login", {"email": "admin_seed@test.com", "password": "admin123456"})
    if not resp:
        print("ERROR: Cannot authenticate admin.")
        return
    token = resp["access_token"]
    print(f"  Token: {token[:20]}...")

    # Step 3: Create 30 jobs
    JOB_TITLES = [
        "Build React Dashboard", "Solidity Smart Contract Audit",
        "Full Stack Web Application", "Mobile App UI Design",
        "Python Data Pipeline", "AWS Infrastructure Setup",
        "REST API Development", "Docker Compose Configuration",
        "Smart Contract Development", "Golang Microservice",
        "React Native App", "Database Migration Script",
        "CI/CD Pipeline Setup", "UI/UX Redesign",
        "Blockchain DApp Frontend", "API Integration",
        "Web Scraping Service", "Load Testing Framework",
        "NFT Marketplace Frontend", "DeFi Dashboard",
        "Content Management System", "E-commerce Platform",
        "Real-time Chat Application", "Analytics Dashboard",
        "Notification System", "Authentication Service",
        "File Upload Service", "Search Engine Optimization",
        "Penetration Testing", "GraphQL API Development",
    ]
    JOB_DESCS = [
        "Looking for an experienced developer to build a modern solution.",
        "Need a skilled freelancer for a short-term project.",
        "Seeking a professional with strong portfolio and experience.",
        "Well-defined scope with detailed requirements available.",
        "Innovative project using cutting-edge technology stack.",
        "Remote-friendly position with flexible working hours.",
        "Complex project requiring deep expertise in the domain.",
        "Long-term collaboration opportunity with competitive pay.",
    ]
    SKILLS_POOL = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Solidity",
        "Rust", "Go", "Java", "C++", "SQL", "AWS", "Docker", "Kubernetes",
        "GraphQL", "Vue.js", "Angular", "PostgreSQL", "MongoDB", "DevOps"
    ]
    CATEGORIES = ["web", "mobile", "blockchain", "design", "data", "devops", "security"]
    STATUS_WEIGHTS = ["open", "open", "open", "filled", "closed"]

    print("\nStep 3: Creating 30 jobs...")
    job_ids = []
    for i in range(30):
        client_id = random.choice(users["clients"])
        title = JOB_TITLES[i]
        budget = round(random.uniform(0.5, 20), 2)
        category = random.choice(CATEGORIES)
        skills = random.sample(SKILLS_POOL, k=random.randint(2, 5))
        days = random.choice([7, 14, 21, 30, 45, 60])
        status = random.choice(STATUS_WEIGHTS)
        desc = f"{random.choice(JOB_DESCS)} Skills: {', '.join(skills)}."
        r = req("POST", "/admin/jobs", {
            "client_id": client_id, "title": title, "description": desc,
            "budget": budget, "category": category, "skills": skills,
            "duration_days": days, "status": status,
        }, token=token)
        if r and r.get("id"):
            job_ids.append({"id": r["id"], "client_id": client_id, "title": title})
            print(f"  [{i+1}/30] {title} ({status})")
        else:
            print(f"  [{i+1}/30] FAILED")
        time.sleep(0.05)

    print(f"  Jobs created: {len(job_ids)}")

    # Step 4: Create 15 proposals
    PROPOSAL_TEXTS = [
        "I have extensive experience and can deliver high-quality results within the timeline.",
        "I am very interested in this project. My background aligns perfectly with your needs.",
        "This looks like a great opportunity. I have completed several similar projects.",
        "I believe I am the perfect fit. My skills match exactly what you're looking for.",
        "I can bring valuable insights and start immediately on this project.",
    ]

    print("\nStep 4: Creating 15 proposals...")
    used_pairs = set()
    proposal_ids = []
    for i in range(15):
        if not job_ids:
            break
        job = random.choice(job_ids)
        freelancer_id = random.choice(users["freelancers"])
        pair = (job["id"], freelancer_id)
        if pair in used_pairs:
            continue
        used_pairs.add(pair)
        bid = round(random.uniform(0.3, 15), 2)
        days = random.randint(5, 60)
        letter = random.choice(PROPOSAL_TEXTS)
        status = random.choices(
            ["pending", "accepted", "rejected"], weights=[50, 30, 20]
        )[0]
        r = req("POST", "/admin/proposals", {
            "job_id": job["id"], "freelancer_id": freelancer_id,
            "cover_letter": letter, "bid_amount": bid, "estimated_days": days,
        }, token=token)
        if r and r.get("id"):
            proposal_ids.append({
                "id": r["id"], "job_id": job["id"],
                "freelancer_id": freelancer_id, "bid_amount": bid,
                "client_id": job["client_id"], "title": job["title"],
            })
            if status != "pending":
                req("PUT", f"/admin/proposals/{r['id']}", {"status": status}, token=token)
            print(f"  [{i+1}/15] bid={bid}ETH, status={status}")
        else:
            print(f"  [{i+1}/15] FAILED")
        time.sleep(0.05)

    print(f"  Proposals created: {len(proposal_ids)}")

    # Step 5: Create 5 contracts
    STATUS_OPTIONS = ["draft", "pending_signatures", "active"]
    print("\nStep 5: Creating 5 contracts...")
    contract_count = 0
    for i, prop in enumerate(proposal_ids):
        if contract_count >= 5:
            break
        r = req("POST", "/admin/contracts", {
            "job_id": prop["job_id"], "client_id": prop["client_id"],
            "freelancer_id": prop["freelancer_id"],
            "title": f"{prop['title']} - Engagement",
            "description": f"Professional engagement for {prop['title']}.",
            "total_amount": round(prop["bid_amount"] * 1.2, 2),
            "status": random.choice(STATUS_OPTIONS),
        }, token=token)
        if r and r.get("id"):
            contract_count += 1
            req("PUT", f"/admin/proposals/{prop['id']}", {"status": "accepted"}, token=token)
            print(f"  [{contract_count}/5] {prop['title'][:40]} ({r['id'][:12]}...) - {r.get('status')}")
        time.sleep(0.05)

    # Summary
    print(f"\n{'='*50}")
    print("SEED DATA GENERATION COMPLETE")
    print(f"{'='*50}")
    print(f"  Users:     {total_users} ({len(users['clients'])} clients, {len(users['freelancers'])} freelancers)")
    print(f"  Jobs:      {len(job_ids)}")
    print(f"  Proposals: {len(proposal_ids)}")
    print(f"  Contracts: {contract_count}")
    print(f"\n  Login: any user @ test12345")
    print(f"  Admin:  admin2@test.com / admin123")
    print(f"  Client: seed_client_0@test.com / test12345")
    print(f"  Frelnc: seed_freelancer_0@test.com / test12345")

if __name__ == "__main__":
    main()
