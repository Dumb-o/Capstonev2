# Startup Report — FreeLedger

> Date: June 16, 2026
> Environment: Linux x86_64, Python 3.14.5, Node 22.22.0, Docker 29.5.1

---

## Environment Summary

| Component | Status | Version |
|---|---|---|
| Docker | ✅ Available | 29.5.1 |
| Docker Compose | ✅ Available | 5.1.4 |
| Node.js | ✅ Available | 22.22.0 |
| npm | ✅ Available | 10.9.4 |
| Python | ✅ Available | 3.14.5 |
| pip | ✅ Available | 26.1.2 |

---

## Dependency Installation

### Backend (Python)

| Result | Detail |
|---|---|
| ✅ INSTALLED | fastapi, uvicorn, sqlalchemy, asyncpg, alembic, redis, pydantic, pydantic-settings, python-jose, bcrypt, passlib, web3, ipfshttpclient, python-multipart, psycopg2-binary, greenlet, httpx, pytest, pytest-asyncio, aiosqlite |
| ⚠️ Version upgrades | Packages installed at latest versions compatible with Python 3.14. The `requirements.txt` pins older versions. Key upgrades: pydantic 2.5.3→2.13.4, web3 6.15.0→7.16.0, redis 5.0.1→8.0.0, bcrypt 4.0.1→5.0.0 |

**Env note**: Python 3.14.5 is bleeding edge. `pip install` without a venv fails due to `externally-managed-environment`. Created `/tmp/freeledger-venv` for testing.

### Frontend (Node)

| Result | Detail |
|---|---|
| ✅ INSTALLED | 1320 packages, `react-scripts build` compiles successfully |
| ⚠️ Vulnerabilities | 61 vulnerabilities (5 low, 35 moderate, 20 high, 1 critical) — all from transitive webpack/react-scripts deps |

---

## Build Results

### Frontend Build

| Result | Detail |
|---|---|
| ✅ SUCCESS | Production build: 185 KB JS, 8 KB CSS |
| Output | `frontend/build/static/js/main.abdd66c2.js`, `frontend/build/static/css/main.6df23778.css` |

---

## Test Results

| Suite | Tests | Pass | Fail | Notes |
|---|---|---|---|---|
| `test_auth.py` | 4 | 1 | 3 | 2 pre-existing failures (no Redis, no DB tables in test). 1 health check expects "ok" but gets "degraded" (expected — no services). |
| `test_ipfs.py` | 2 | 2 | 0 | ✅ |
| `test_p01_async_blockchain.py` | 7 | 7 | 0 | ✅ |
| `test_integration.py` | 2 | 2 | 0 | ✅ |
| **Total** | **15** | **12** | **3** | All 3 failures are pre-existing/environmental |

**Known Pre-Existing Failures** (documented in P1_test.txt, P2_test.txt):
- `test_health_check`: Returns "degraded" instead of "ok" when underlying services not running
- `test_challenge_endpoint`: SQLite in-memory DB has no tables — test doesn't create schema
- `test_login_without_challenge`: No Redis running in test environment

### Frontend Tests

| Result | Detail |
|---|---|
| ❌ NOT CONFIGURED | No test framework in `frontend/package.json` (no Jest/react-testing-library) |

---

## Docker Compose

| Result | Detail |
|---|---|
| ✅ IMAGES PULL | All 5 images (postgres:15, redis:7, ipfs/kubo:v0.28.0, hardhat node:18, backend) are available/pulled |
| ⚠️ NOT STARTED | Not started to avoid modifying system state without approval |

---

## Linting

| Result | Detail |
|---|---|
| ❌ NO LINT CONFIG | No `.flake8`, `.pylintrc`, `.eslintrc`, or `.prettierrc` found in project root, backend, or frontend |
| ❌ NO LINTERS | `flake8` not installed. ESLint not configured in frontend |

---

## Identified Issues (Not To Be Fixed Yet)

### Build Blockers
| ID | Severity | Description |
|---|---|---|
| SB-01 | HIGH | Python 3.14 incompatibility with pinned `requirements.txt`. Package versions need upgrading (pydantic-core, asyncpg, greenlet, psycopg2-binary). |
| SB-02 | MEDIUM | No linting/formatting configured for backend or frontend. |
| SB-03 | LOW | Frontend has 61 npm vulnerabilities (20 high). All from react-scripts transitive deps. |

### Runtime Blockers (without Docker)
| ID | Severity | Description |
|---|---|---|
| SB-04 | HIGH | Backend requires PostgreSQL, Redis, IPFS, and Hardhat running. Docker compose is the only startup path. |
| SB-05 | MEDIUM | 2 backend tests fail without running Redis and proper DB setup. |
| SB-06 | LOW | Health endpoint reports "degraded" when any service is down (expected behavior). |

### API Compatibility Warnings
| ID | Severity | Description |
|---|---|---|
| SB-07 | MEDIUM | `web3` upgraded from 6.x to 7.16.0. API breaking changes possible. |
| SB-08 | LOW | `bcrypt` upgraded from 4.x to 5.0.0. passlib compatibility may need verification. |
| SB-09 | LOW | `redis` upgraded from 5.0.1 to 8.0.0. API changes in async usage possible. |

### Deprecation Warnings
| ID | Severity | Description |
|---|---|---|
| SB-10 | LOW | 8 Pydantic V2 deprecation warnings: class-based `config` should be `ConfigDict`. |
| SB-11 | LOW | 2 `datetime.utcnow()` deprecation warnings (GAP-14). |

---

## Startup Command Reference

```bash
# Infrastructure
docker compose -f docker/docker-compose.yml up -d

# Backend (via venv)
source /tmp/freeledger-venv/bin/activate
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload

# Frontend (separate terminal)
cd frontend && npm start

# Tests (via venv)
DATABASE_URL="sqlite+aiosqlite:///:memory:" PYTHONPATH=backend \
  /tmp/freeledger-venv/bin/pytest tests/backend/ -v --override-ini="asyncio_mode=auto"

# Smart Contract (requires running Hardhat)
cd contracts && npx hardhat run scripts/deploy.js --network localhost
```
