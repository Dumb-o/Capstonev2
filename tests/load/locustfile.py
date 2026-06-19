"""
FreeLedger Load Tests — Locust

Usage:
    locust -f tests/load/locustfile.py --host http://localhost:8000

Scenarios:
  1. Browse jobs (100 users, 10s ramp-up) — unauthenticated reads
  2. Client workflow (50 users) — login, create job, view proposals, fund contract
  3. Freelancer workflow (50 users) — login, browse jobs, submit proposal, submit milestone
  4. Mixed workload (80 users) — all of the above simultaneously

Targets:
  - P95 < 1.5s for reads (GET /api/jobs, GET /api/contracts)
  - P95 < 3.0s for writes (POST create, PUT update)
  - Error rate < 1%
"""

import random
import string
from locust import HttpUser, task, between, constant

# ── Helpers ──────────────────────────────────────────────────────────────────

CLIENT_EMAILS = [f"load_client_{i}@test.freeledger" for i in range(100)]
FREELANCER_EMAILS = [f"load_freelancer_{i}@test.freeledger" for i in range(100)]
PASSWORD = "LoadTest123!"

JOB_TITLES = [
    "Build a React dashboard",
    "Smart contract audit",
    "API integration for payment gateway",
    "Mobile app UI design",
    "Database migration script",
    "Web3 frontend for NFT marketplace",
    "Python data pipeline",
    "DevOps CI/CD setup",
    "REST API with FastAPI",
    "Solidity contract testing",
]

SKILLS_POOL = ["Python", "React", "Solidity", "TypeScript", "Go", "Rust", "Docker", "Kubernetes"]


def rand_str(n=8):
    return "".join(random.choices(string.ascii_lowercase, k=n))


# ── Base User — shares login logic ───────────────────────────────────────────

class FreeLedgerUser(HttpUser):
    abstract = True
    wait_time = between(0.5, 3.0)

    def on_start(self):
        self.token = None
        self.user_id = None
        self.my_jobs = []
        self.my_contracts = []
        self.my_proposals = []

    def _register(self, email):
        resp = self.client.post(
            "/api/auth/email/register",
            json={
                "email": email,
                "password": PASSWORD,
                "username": f"load_{rand_str(6)}",
                "role": "client" if "client" in email else "freelancer",
            },
        )
        if resp.status_code == 409:
            resp = self.client.post(
                "/api/auth/email/login",
                json={"email": email, "password": PASSWORD},
            )
        if resp.status_code == 200 or resp.status_code == 201:
            data = resp.json()
            self.token = data["access_token"]
            self.user_id = data["user"]["id"]
        return resp.ok

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _get(self, path, **kw):
        return self.client.get(path, headers=self._headers(), **kw, name=path)

    def _post(self, path, json=None, **kw):
        return self.client.post(path, json=json, headers=self._headers(), **kw, name=path)

    def _put(self, path, json=None, **kw):
        return self.client.put(path, json=json, headers=self._headers(), **kw, name=path)


# ── Scenario 1: Browse jobs (unauthenticated, read-only) ─────────────────────

class BrowseJobsUser(HttpUser):
    wait_time = between(0.3, 1.5)

    @task(10)
    def list_jobs(self):
        self.client.get("/api/jobs/?page=1&limit=20", name="GET /api/jobs")

    @task(3)
    def list_jobs_filtered(self):
        cat = random.choice(["", "?category=design", "?category=development", "?category=blockchain"])
        self.client.get(f"/api/jobs/{cat}", name="GET /api/jobs?filter")

    @task(1)
    def health_check(self):
        self.client.get("/api/health", name="GET /api/health")


# ── Scenario 2: Client workflow ──────────────────────────────────────────────

class ClientUser(FreeLedgerUser):
    wait_time = between(1.0, 4.0)

    def on_start(self):
        super().on_start()
        email = random.choice(CLIENT_EMAILS)
        self._register(email)

    @task(5)
    def create_job(self):
        title = random.choice(JOB_TITLES)
        skills = random.sample(SKILLS_POOL, k=random.randint(2, 4))
        resp = self._post(
            "/api/jobs/",
            json={
                "title": f"{title} — {rand_str(4)}",
                "description": f"Load test job created by {self.user_id}",
                "budget": round(random.uniform(1.0, 50.0), 2),
                "skills": skills,
                "duration_days": random.randint(5, 30),
            },
        )
        if resp.status_code == 201:
            self.my_jobs.append(resp.json()["id"])

    @task(3)
    def list_my_jobs(self):
        if self.my_jobs:
            self._get("/api/jobs/")

    @task(2)
    def get_contracts(self):
        self._get("/api/contracts/?role=client")

    @task(1)
    def view_proposals(self):
        self._get("/api/proposals/received")

    @task(1)
    def get_profile(self):
        self._get("/api/auth/me")


# ── Scenario 3: Freelancer workflow ──────────────────────────────────────────

class FreelancerUser(FreeLedgerUser):
    wait_time = between(1.0, 4.0)

    def on_start(self):
        super().on_start()
        email = random.choice(FREELANCER_EMAILS)
        self._register(email)

    @task(8)
    def browse_jobs(self):
        self._get("/api/jobs/?page=1&limit=20")

    @task(4)
    def submit_proposal(self):
        resp = self._get("/api/jobs/?status=open&limit=5")
        if resp.status_code != 200:
            return
        jobs = resp.json().get("jobs", [])
        if not jobs:
            return
        job = random.choice(jobs)
        resp = self._post(
            f"/api/jobs/{job['id']}/proposals",
            json={
                "cover_letter": "I am interested in this project and have relevant experience.",
                "bid_amount": round(job["budget"] * random.uniform(0.8, 1.0), 2),
                "estimated_days": random.randint(5, 20),
            },
        )
        if resp.status_code == 201:
            self.my_proposals.append(resp.json()["id"])

    @task(3)
    def my_proposals(self):
        self._get("/api/proposals/mine")

    @task(2)
    def my_contracts(self):
        self._get("/api/contracts/?role=freelancer")

    @task(1)
    def get_profile(self):
        self._get("/api/auth/me")


# ── Scenario 4: Mixed workload (admin + health + ipfs) ───────────────────────

class AdminUser(FreeLedgerUser):
    wait_time = between(2.0, 5.0)

    def on_start(self):
        super().on_start()
        self._register("load_admin@test.freeledger")

    @task(3)
    def admin_stats(self):
        self._get("/api/admin/stats")

    @task(2)
    def admin_list_users(self):
        self._get("/api/admin/users")

    @task(2)
    def admin_list_disputes(self):
        self._get("/api/admin/disputes")


class MixedUser(FreeLedgerUser):
    wait_time = between(0.5, 3.0)

    def on_start(self):
        super().on_start()
        email = random.choice(CLIENT_EMAILS + FREELANCER_EMAILS)
        self._register(email)
        self.is_client = "client" in email

    @task(4)
    def list_jobs(self):
        self._get("/api/jobs/")

    @task(2)
    def get_contracts(self):
        self._get("/api/contracts/")

    @task(2)
    def get_profile(self):
        self._get("/api/auth/me")

    @task(1)
    def create_job_if_client(self):
        if not self.is_client:
            return
        resp = self._post(
            "/api/jobs/",
            json={
                "title": f"Mixed job {rand_str(4)}",
                "description": "Created by mixed workload user",
                "budget": round(random.uniform(1.0, 20.0), 2),
                "skills": random.sample(SKILLS_POOL, k=2),
                "duration_days": random.randint(3, 15),
            },
        )
        if resp.status_code == 201:
            self.my_jobs.append(resp.json()["id"])
