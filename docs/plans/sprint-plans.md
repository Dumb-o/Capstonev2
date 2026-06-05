# FreeLedger — Sprint Plans

**Project**: A Decentralized Freelance Protocol with Web3 Integration
**Supervisor**: Subit Timalsina
**Team**: Sarun (PM/Blockchain), Bijee (Frontend), Pawan (DB/Storage/Security), Anushree (Backend/API), Runa (Workflow/Backend)

---

## Current Status (June 2026)

| Sprint | Status | Notes |
|---|---|---|
| **Sprint 0** — Foundation | ✅ Complete | Docker Compose, scaffolding, env config |
| **Sprint 1** — Backbone | ✅ Complete | Smart contract, DB/IPFS, Auth (wallet + email) |
| **Sprint 2** — Core Freelance Flow | ✅ Complete | Contracts CRUD, IPFS, event listener, contract UI |
| **Sprint 3** — Milestones & Disputes | ⚠️ Partial | Milestones done; dispute creation button missing from frontend |
| **Sprint 4** — Remaining Features | ⚠️ Partial | Messaging, Admin, Profiles, Jobs browse done; **Proposal frontend missing** |
| **Sprint 5** — Production Readiness | 🔴 Not Started | Only 6 tests exist; no rate limiting, deployment guide, or perf tuning |

**Additional delivered:**
- `bijee_frontend/` — Static HTML/CSS/JS for client, freelancer, and freeledger portals
- `backend/app/services/event_listener.py` — Background blockchain event polling (MilestoneApproved, DisputeRaised, DisputeResolved)

---

## Sprint 0 — Foundation (Everyone)

**Goal**: Shared infrastructure, API contract, project scaffolding.

| Task | Owner | Status | Details |
|---|---|---|---|
| **Docker Compose** | Pawan / Runa | ✅ Done | PostgreSQL 15, Redis 7, IPFS Kubo v0.28, Hardhat node |
| **API contract** | Runa / Anushree / Bijee | ✅ Done | All routes defined, request/response shapes, auth scheme |
| **Project scaffolding** | Anushree (backend), Bijee (frontend) | ✅ Done | FastAPI skeleton, React skeleton, shared config |
| **Environment config** | Sarun | ✅ Done | `.env` template, shared secrets convention |

**Deliverable**: `docker compose up` spins up all infra. `localhost:8000/health` responds OK. `localhost:3000` renders landing page.

---

## Sprint 1 — Backbone (3 parallel tracks)

### Track A: Smart Contract — Sarun
| Task | Status |
|---|---|
| `GigEscrow.sol` — structs, enums, state machine, platform fees | ✅ Done |
| Hardhat tests covering all state transitions | ✅ Done |
| Deploy script with address export | ✅ Done |
| Contract ABI exported for backend/frontend consumption | ✅ Done |

### Track B: Database & Storage — Pawan
| Task | Status |
|---|---|
| Alembic migrations (not `create_all()`) | ✅ Done |
| Full `schema.sql` with enums, indexes, foreign keys | ✅ Done |
| IPFS service layer: `upload_file()`, `download_file()`, `pin()` | ✅ Done |
| Database service layer with session management | ✅ Done |

### Track C: Auth System — Anushree (backend) + Bijee (frontend)

**Backend (Anushree)**:
| Task | Status |
|---|---|
| `POST /api/auth/challenge` — generate nonce, store in Redis with TTL | ✅ Done |
| `POST /api/auth/login` — ECDSA signature recovery via `eth_account`, issue JWT | ✅ Done |
| `POST /api/auth/refresh` — refresh token rotation | ✅ Done |
| `POST /api/auth/logout` — blacklist access token | ✅ Done |
| `GET /api/auth/me` — JWT-protected user info | ✅ Done |
| `middleware/auth.py` — proper `get_current_user()` dependency | ✅ Done |

**Frontend (Bijee)**:
| Task | Status |
|---|---|
| MetaMask `connect()` + `signMessage()` integration | ✅ Done |
| JWT storage in `localStorage`, auto-attach via axios interceptor | ✅ Done |
| Session persistence on page reload | ✅ Done |
| Wallet disconnection + logout | ✅ Done |

**Deliverable**: User connects MetaMask → signs nonce → receives JWT → sees dashboard. Also supports email/password registration and login.

---

## Sprint 2 — Core Freelance Flow

### Smart Contract Interaction — Sarun
| Task | Status |
|---|---|
| Backend Web3 service: `deploy_contract()`, `fund_contract()`, `release_payment()`, `get_contract_state()` | ✅ Done |
| Background event listener (asyncio task polling `PaymentReleased`, `DisputeRaised` events) | ✅ Done |
| Frontend: Real transaction signing via ethers.js contract calls | ✅ Done (server-side via private key) |

### Contract API — Anushree
| Task | Status |
|---|---|
| `POST /api/contracts` — create contract → store terms in IPFS → deploy escrow on blockchain | ✅ Done |
| `GET /api/contracts` — list user's contracts with filters | ✅ Done |
| `GET /api/contracts/{id}` — full contract with milestones + deliverables | ✅ Done |
| `POST /api/contracts/{id}/sign` — sign via MetaMask, update DB + blockchain | ✅ Done |

### Contract UI — Bijee
| Task | Status |
|---|---|
| Contract creation form (title, description, budget, deadline, milestone breakdown) | ✅ Done |
| Contract list (both dashboards) with status badges | ✅ Done |
| Contract detail view with milestone checklist, sign buttons, status timeline | ✅ Done |

### IPFS Integration — Pawan
| Task | Status |
|---|---|
| `POST /api/ipfs/upload` — file multipart → IPFS Kubo → CID | ✅ Done |
| `GET /api/ipfs/download/{cid}` — CID → file stream | ✅ Done |
| Frontend file upload component → calls IPFS API → attaches CID to contract/milestone | ✅ Done |

**Deliverable**: Client creates a contract → terms stored in IPFS → escrow smart contract deployed → both parties sign → contract is "In Progress".

---

## Sprint 3 — Milestones, Payments & Disputes

### Milestone Flow
| Layer | Owner | Status |
|---|---|---|
| `POST /contracts/{id}/milestones/{idx}/submit` + CID validation | Anushree | ✅ Done |
| `POST /contracts/{id}/milestones/{idx}/approve` → calls `release()` on smart contract | Anushree | ✅ Done |
| `POST /contracts/{id}/milestones/{idx}/reject` with reason | Anushree | ✅ Done |
| Blockchain event listener updates DB status to "Paid" on `PaymentReleased` | Sarun | ✅ Done |
| Milestone submission UI (file upload via IPFS + deliverable hash) | Bijee | ✅ Done |
| Milestone approval UI (download deliverable, approve/reject buttons) | Bijee | ✅ Done |

### Dispute Flow
| Layer | Owner | Status |
|---|---|---|
| `raiseDispute()` / `resolveDispute()` in Solidity | Sarun | ✅ Done |
| `POST /api/disputes` + `GET /api/disputes` | Anushree | ✅ Done |
| Admin: `GET /api/admin/disputes` + resolution endpoint | Anushree | ✅ Done |
| Blockchain event `DisputeRaised` → pauses contract on-chain | Sarun | ✅ Done |
| Blockchain event `DisputeResolved` → triggers refund or release | Sarun | ✅ Done |
| Dispute UI (raise dispute button, admin review dashboard) | Bijee | ⚠️ **Missing** — dispute info shown read-only on contract detail, but no "Raise Dispute" button |

**Deliverable**: Full lifecycle — submit deliverable → approve → payment released via smart contract. Or raise dispute → admin reviews → resolves with refund or payment.

---

## Sprint 4 — Remaining Features

| Feature | Backend | Frontend | Status |
|---|---|---|---|
| **Jobs** — CRUD, search, filter, category | Anushree ✅ | Bijee ✅ (browse + detail) | ✅ Done (client-side search only) |
| **Proposals** — submit, accept/reject | Anushree ✅ | Bijee ❌ **Not implemented** | ⚠️ **Frontend gap** — API works, no UI |
| **Messaging** — conversations, send/read | Anushree ✅ | Bijee ✅ | ✅ Done |
| **User Profiles** — edit (username, bio, skills, hourly rate) | Anushree ✅ | Bijee ✅ | ✅ Done |
| **Redis sessions** — store + expire JWT refresh tokens | Anushree / Pawan ✅ | — | ✅ Done |
| **Admin management** — user mgmt, platform stats | Anushree ✅ | Bijee ✅ | ✅ Done |

---

## Sprint 5 — Production Readiness

| Task | Owner | Status |
|---|---|---|
| Unit + integration tests for everything | All | 🔴 **Not started** (only 6 tests exist) |
| Security audit (input validation, rate limiting, CORS hardening) | Pawan | 🔴 Not started |
| Rate limiting middleware (Redis-backed) | Pawan | 🔴 Not started |
| Dockerize backend + frontend containers | Pawan / Runa | ⚠️ Partial (infra containers exist, app containers not built) |
| Environment-agnostic config (dev/staging/prod) | Runa | 🔴 Not started |
| Contract verification (Etherscan) | Sarun | 🔴 Not started |
| API auto-docs (FastAPI OpenAPI) | Anushree | ✅ Built-in (FastAPI generates automatically) |
| Load testing / performance tuning | All | 🔴 Not started |
| Deployment guide | Runa | 🔴 Not started |

---

## Known Gaps (from June 2026 audit)

1. **Proposal frontend is completely missing** — freelancers cannot submit proposals, clients cannot review/accept them from UI
2. **Dispute creation not exposed in frontend** — users cannot initiate a dispute from contract detail page
3. **No real-time messaging** — no WebSocket, SSE, or polling
4. **No direct wallet interaction from frontend** — blockchain ops use server-side private key
5. **Test coverage critically thin** — only 6 tests across the entire project
6. **No notifications system** — no email/push/in-app notifications
7. **ExploreJobs search is client-side only** — API supports server-side filtering but frontend only filters loaded results

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

**Overlay — actual completion (June 2026):**
```
Sprint 0 ████████████████████████████████ 100%
Sprint 1 ████████████████████████████████ 100%
Sprint 2 ████████████████████████████████ 100%
Sprint 3 ████████████████████████████░░░░  85%
Sprint 4 ████████████████████░░░░░░░░░░░░  70%
Sprint 5 ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%
```

---

## Architecture Principles

1. **API-first**: Frontend and backend agree on the API contract before writing code
2. **Privacy-first**: Wallet addresses never stored in databases; pseudonymous IDs used
3. **Hybrid**: Centralized FastAPI for speed; decentralized blockchain for trust
4. **Event-driven**: Backend listens to blockchain events to sync database state
5. **Asynchronous**: FastAPI async handlers prevent thread starvation during blockchain/IPFS calls
