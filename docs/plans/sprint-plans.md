# FreeLedger — Sprint Plans

**Project**: A Decentralized Freelance Protocol with Web3 Integration
**Supervisor**: Subit Timalsina
**Team**: Sarun (PM/Blockchain), Bijee (Frontend), Pawan (DB/Storage/Security), Anushree (Backend/API), Runa (Workflow/Backend)

---

## Sprint 0 — Foundation (Everyone)

**Goal**: Shared infrastructure, API contract, project scaffolding.

| Task | Owner | Details |
|---|---|---|
| **Docker Compose** | Pawan / Runa | PostgreSQL 15, Redis 7, IPFS Kubo v0.28, Hardhat node |
| **API contract** | Runa / Anushree / Bijee | Define all routes, request/response shapes, auth scheme before coding |
| **Project scaffolding** | Anushree (backend), Bijee (frontend) | FastAPI skeleton, React skeleton, shared config |
| **Environment config** | Sarun | `.env` template, shared secrets convention |

**Deliverable**: `docker compose up` spins up all infra. `localhost:8000/health` responds OK. `localhost:3000` renders landing page.

---

## Sprint 1 — Backbone (3 parallel tracks)

### Track A: Smart Contract — Sarun
- `GigEscrow.sol` — structs, enums, state machine, platform fees
- Hardhat tests covering all state transitions
- Deploy script with address export
- Contract ABI exported for backend/frontend consumption

### Track B: Database & Storage — Pawan
- Alembic migrations (not `create_all()`)
- Full `schema.sql` with enums, indexes, foreign keys
- IPFS service layer: `upload_file()`, `download_file()`, `pin()`
- Database service layer with session management

### Track C: Auth System — Anushree (backend) + Bijee (frontend)

**Backend (Anushree)**:
- `POST /api/auth/challenge` — generate nonce, store in Redis with TTL
- `POST /api/auth/login` — ECDSA signature recovery via `eth_account`, issue JWT
- `POST /api/auth/refresh` — refresh token rotation
- `POST /api/auth/logout` — blacklist access token
- `GET /api/auth/me` — JWT-protected user info
- `middleware/auth.py` — proper `get_current_user()` dependency

**Frontend (Bijee)**:
- MetaMask `connect()` + `signMessage()` integration
- JWT storage in `localStorage`, auto-attach via axios interceptor
- Session persistence on page reload
- Wallet disconnection + logout

**Deliverable**: User connects MetaMask → signs nonce → receives JWT → sees dashboard.

---

## Sprint 2 — Core Freelance Flow

### Smart Contract Interaction — Sarun
- Backend Web3 service: `deploy_contract()`, `fund_contract()`, `release_payment()`, `get_contract_state()`
- Background event listener (asyncio task polling `PaymentReleased`, `DisputeRaised` events)
- Frontend: Real transaction signing via ethers.js contract calls

### Contract API — Anushree
- `POST /api/contracts` — create contract → store terms in IPFS → deploy escrow on blockchain
- `GET /api/contracts` — list user's contracts with filters
- `GET /api/contracts/{id}` — full contract with milestones + deliverables
- `POST /api/contracts/{id}/sign` — sign via MetaMask, update DB + blockchain

### Contract UI — Bijee
- Contract creation form (title, description, budget, deadline, milestone breakdown)
- Contract list (both dashboards) with status badges
- Contract detail view with milestone checklist, sign buttons, status timeline

### IPFS Integration — Pawan
- `POST /api/ipfs/upload` — file multipart → IPFS Kubo → CID
- `GET /api/ipfs/download/{cid}` — CID → file stream
- Frontend file upload component → calls IPFS API → attaches CID to contract/milestone

**Deliverable**: Client creates a contract → terms stored in IPFS → escrow smart contract deployed → both parties sign → contract is "In Progress".

---

## Sprint 3 — Milestones, Payments & Disputes

### Milestone Flow
| Layer | Owner |
|---|---|
| `POST /contracts/{id}/milestones/{idx}/submit` + CID validation | Anushree |
| `POST /contracts/{id}/milestones/{idx}/approve` → calls `release()` on smart contract | Anushree |
| Blockchain event listener updates DB status to "Paid" on `PaymentReleased` | Sarun |
| Milestone submission UI (file upload via IPFS + deliverable hash) | Bijee |
| Milestone approval UI (download deliverable, approve/reject buttons) | Bijee |

### Dispute Flow
| Layer | Owner |
|---|---|
| `raiseDispute()` / `resolveDispute()` in Solidity | Sarun |
| `POST /api/disputes` + `PUT /api/disputes/{id}/resolve` | Anushree |
| Admin: `GET /api/admin/disputes` + resolution endpoint | Anushree |
| Blockchain event `DisputeRaised` → pauses contract on-chain | Sarun |
| Blockchain event `DisputeResolved` → triggers refund or release | Sarun |
| Dispute UI (raise dispute button, admin review dashboard) | Bijee |

**Deliverable**: Full lifecycle — submit deliverable → approve → payment released via smart contract. Or raise dispute → admin reviews → resolves with refund or payment.

---

## Sprint 4 — Remaining Features

| Feature | Backend | Frontend |
|---|---|---|
| **Jobs** — CRUD, search, filter, category | Anushree | Bijee |
| **Proposals** — submit, accept/reject | Anushree | Bijee |
| **Messaging** — conversations, send/read | Anushree | Bijee |
| **User Profiles** — edit (username, bio, skills, hourly rate) | Anushree | Bijee |
| **Redis sessions** — store + expire JWT refresh tokens | Anushree / Pawan | — |
| **Admin management** — user mgmt, platform stats | Anushree | Bijee |

---

## Sprint 5 — Production Readiness

| Task | Owner |
|---|---|
| Unit + integration tests for everything | All |
| Security audit (input validation, rate limiting, CORS hardening) | Pawan |
| Rate limiting middleware (Redis-backed) | Pawan |
| Dockerize backend + frontend containers | Pawan / Runa |
| Environment-agnostic config (dev/staging/prod) | Runa |
| Contract verification (Etherscan) | Sarun |
| API auto-docs (FastAPI OpenAPI) | Anushree |
| Load testing / performance tuning | All |
| Deployment guide | Runa |

---

## Critical Path

```
Sprint 0 (Infra + Scaffolding)
    │
    ▼
Sprint 1 ─────────────────────────────────
│  ├── Smart Contract (Sarun)              │
│  ├── DB + IPFS (Pawan)                  │
│  └── Auth (Anushree + Bijee)            │
└──────────────┬──────────────────────────┘
               ▼
Sprint 2 (Contract Creation + IPFS + Signing)
               │
               ▼
Sprint 3 (Milestones + Payments + Disputes)
               │
               ▼
Sprint 4 (Jobs, Proposals, Messages, Admin)
               │
               ▼
Sprint 5 (Tests, Security, Dockerization, Production)
```

---

## Architecture Principles

1. **API-first**: Frontend and backend agree on the API contract before writing code
2. **Privacy-first**: Wallet addresses never stored in databases; pseudonymous IDs used
3. **Hybrid**: Centralized FastAPI for speed; decentralized blockchain for trust
4. **Event-driven**: Backend listens to blockchain events to sync database state
5. **Asynchronous**: FastAPI async handlers prevent thread starvation during blockchain/IPFS calls
