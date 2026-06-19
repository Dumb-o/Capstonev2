# FreeLedger — Sprint Plans

**Project**: A Decentralized Freelance Protocol with Web3 Integration
**Supervisor**: Subit Timalsina
**Team**: Sarun (PM/Blockchain), Bijee (Frontend), Pawan (DB/Storage/Security), Anushree (Backend/API), Runa (Workflow/Backend)

---

## Current Status (June 11, 2026)

| Sprint | Status | Notes |
|---|---|---|
| **Sprint 0** — Foundation | ✅ Complete | Docker Compose, scaffolding, env config |
| **Sprint 1** — Backbone | ✅ Complete | Smart contract, DB/IPFS, Auth (wallet + email) |
| **Sprint 2** — Core Freelance Flow | ✅ Complete | Contracts CRUD, IPFS, event listener, contract UI |
| **Sprint 3** — Milestones & Disputes | ✅ Complete | Milestones + disputes fully implemented (backend + frontend) |
| **Sprint 4** — Remaining Features | ✅ Complete | Jobs, Proposals, Messages, Admin, Profiles all done |
| **Sprint 5** — Production Readiness | 🔴 Remaining | Tests, security, dockerization, performance, polish |

**Overall completion**: ~90% functional. All 18 FRs addressed (16 done, 2 pending). All 14 NFRs addressed (9 done, 3 partial, 2 pending).

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

**Deliverable**: User connects MetaMask -> signs nonce -> receives JWT -> sees dashboard. Also supports email/password registration and login.

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
| `POST /api/contracts` — create contract -> store terms in IPFS -> deploy escrow on blockchain | ✅ Done |
| `GET /api/contracts` — list user's contracts with filters | ✅ Done |
| `GET /api/contracts/{id}` — full contract with milestones + deliverables | ✅ Done |
| `POST /api/contracts/{id}/sign` — sign via MetaMask, update DB + blockchain | ✅ Done |
| `POST /api/contracts/{id}/fund` — fund contract on-chain with milestone-based escrow | ✅ Done |

### Contract UI — Bijee
| Task | Status |
|---|---|
| Contract creation form (title, description, budget, deadline, milestone breakdown) | ✅ Done |
| Contract list (both dashboards) with status badges | ✅ Done |
| Contract detail view with milestone checklist, sign buttons, status timeline | ✅ Done |

### IPFS Integration — Pawan
| Task | Status |
|---|---|
| `POST /api/ipfs/upload` — file multipart -> IPFS Kubo -> CID | ✅ Done |
| `GET /api/ipfs/download/{cid}` — CID -> file stream | ✅ Done |
| Frontend file upload component -> calls IPFS API -> attaches CID to contract/milestone | ✅ Done |

**Deliverable**: Client creates a contract -> terms stored in IPFS -> escrow smart contract deployed -> both parties sign -> contract funded -> "Active".

---

## Sprint 3 — Milestones, Payments & Disputes

### Milestone Flow
| Layer | Owner | Status |
|---|---|---|
| `POST /contracts/{id}/milestones/{idx}/submit` + CID validation | Anushree | ✅ Done |
| `POST /contracts/{id}/milestones/{idx}/approve` -> calls `release()` on smart contract | Anushree | ✅ Done |
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
| Blockchain event `DisputeRaised` -> pauses contract on-chain | Sarun | ✅ Done |
| Blockchain event `DisputeResolved` -> triggers refund or release | Sarun | ✅ Done |
| Dispute UI (raise dispute button, admin review dashboard) | Bijee | ✅ Done — Admin Panel has full dispute management; contract detail shows dispute info |

**Deliverable**: Full lifecycle — submit deliverable -> approve -> payment released via smart contract. Or raise dispute -> admin reviews -> resolves with refund or payment.

---

## Sprint 4 — Remaining Features

| Feature | Backend | Frontend | Status |
|---|---|---|---|
| **Jobs** — CRUD, search, filter, category | Anushree ✅ | Bijee ✅ (browse + detail) | ✅ Done (client-side search only) |
| **Proposals** — submit, accept/reject | Anushree ✅ | Bijee ✅ (ProposalForm + dashboard) | ✅ Done — `ProposalForm.js` with cover letter, bid, estimated days |
| **Messaging** — conversations, send/read | Anushree ✅ | Bijee ✅ | ✅ Done |
| **User Profiles** — edit (username, bio, skills, hourly rate) | Anushree ✅ | Bijee ✅ | ✅ Done |
| **Redis sessions** — store + expire JWT refresh tokens | Anushree / Pawan ✅ | — | ✅ Done |
| **Admin management** — user mgmt, platform stats, all CRUD | Anushree ✅ | Bijee ✅ | ✅ Done — 7-tab admin UI with full CRUD |

---

## Sprint 5 — Production Readiness (Remaining Work)

### Phase 5A: Testing (High Priority)

| Task | Owner | Details | Est. Effort |
|---|---|---|---|
| Backend unit tests — contracts service | Anushree | Test create, sign, fund, milestone submit/approve/reject flows | 1 day |
| Backend unit tests — disputes & admin | Anushree | Test dispute raise, admin resolve, user management | 0.5 day |
| Backend unit tests — messaging | Anushree | Test conversation list, send, read, unread count | 0.5 day |
| Backend unit tests — proposals | Anushree | Test submit, list, accept/reject flows | 0.5 day |
| Backend unit tests — auth edge cases | Anushree | Test expired tokens, invalid signatures, duplicate wallets | 0.5 day |
| Backend integration tests — full contract lifecycle | Pawan | Contract create -> sign -> fund -> milestone -> approve -> complete | 1 day |
| Backend integration tests — dispute lifecycle | Pawan | Milestone -> dispute -> admin resolve -> refund/release | 0.5 day |
| Backend integration tests — IPFS upload -> milestone submit -> approve | Pawan | End-to-end file upload to milestone payment | 0.5 day |
| Frontend component tests — ProposalForm | Bijee | Test form validation, submission, error states | 0.5 day |
| Frontend component tests — Dashboards | Bijee | Test stats loading, proposal list, job posting form | 0.5 day |
| Frontend component tests — ContractDetailPage | Bijee | Test sign, approve, reject, dispute display | 0.5 day |
| Smart contract edge case tests | Sarun | Test reentrancy, overflow, unauthorized access | 0.5 day |
| **Total testing effort** | **All** | | **~7 days** |

### Phase 5B: Security Hardening

| Task | Owner | Details | Est. Effort |
|---|---|---|---|
| Redis-backed rate limiting middleware | Pawan | `slowapi` or custom middleware — limit 100 req/min per user | 1 day |
| CORS hardening | Pawan | Restrict `allow_origins` to specific frontend domains | 0.5 day |
| Input sanitization — prevent XSS in job/message content | Pawan | Sanitize HTML in text fields before storage | 0.5 day |
| Private key management improvement | Sarun | Add option for external signer (e.g., web3.py Account), document prod key handling | 1 day |
| JWT secret rotation support | Anushree | Support multiple valid secrets during rotation window | 0.5 day |
| **Total security effort** | | | **~3.5 days** |

### Phase 5C: Infrastructure & DevOps

| Task | Owner | Details | Est. Effort |
|---|---|---|---|
| Dockerize backend (Dockerfile + docker-compose service) | Pawan | Backend container with uvicorn, healthcheck | 1 day |
| Dockerize frontend (Dockerfile + nginx) | Bijee | Production frontend container serving built React app | 1 day |
| Environment-agnostic config | Runa | `.env.dev`, `.env.staging`, `.env.production` with validation | 0.5 day |
| Deployment guide | Runa | Step-by-step guide for production deployment | 1 day |
| **Total infra effort** | | | **~3.5 days** |

### Phase 5D: Performance & Monitoring

| Task | Owner | Details | Est. Effort |
|---|---|---|---|
| Load testing script (locust/k6) | Pawan | Simulate 50 concurrent users, measure latency | 1 day |
| API response time monitoring | Runa | Add request timing middleware, log slow endpoints | 0.5 day |
| IPFS availability monitoring | Pawan | Health check script for IPFS node connectivity | 0.5 day |
| Blockchain event listener health check | Sarun | Add heartbeat metric, alert on missed polls | 0.5 day |
| **Total perf effort** | | | **~2.5 days** |

### Phase 5E: UX Polish

| Task | Owner | Details | Est. Effort |
|---|---|---|---|
| Server-side ExploreJobs search | Bijee | Pass search query to API `?q=` param instead of client filter | 0.5 day |
| Real-time messaging via WebSocket/SSE | Anushree/Bijee | Redis pub/sub backend, WebSocket event emitter, auto-refresh | 2 days |
| Notifications system (model + UI) | Runa/Bijee | `notifications` table, bell icon badge, dropdown list | 2 days |
| Dispute creation button on contract detail | Bijee | "Raise Dispute" button -> modal -> POST /contracts/{id}/disputes | 0.5 day |
| Proposal acceptance -> auto-create contract | Anushree | When proposal accepted, auto-generate draft contract with milestones | 1 day |
| ~~Bijee design system unification~~ | ~~Bijee~~ | ~~Promote `bijee_frontend/` CSS patterns into main `styles.css`~~ | ~~1 day~~ |
| Clean up unused component trees | Bijee | Remove dead components not referenced by `App.js` | 0.5 day |
| Detailed job descriptions | Bijee | Rich text or structured fields (deliverables, roadmap, acceptance criteria) | 1 day |
| **Total UX effort** | | | **~8.5 days** |

---

## Master Timeline (Ordered Execution)

```
Week 1-2: Phase 5A — Testing (7 days)
  ├── Backend unit tests (Anushree) — 3 days
  ├── Backend integration tests (Pawan) — 2 days
  ├── Frontend tests (Bijee) — 1.5 days
  └── Contract edge cases (Sarun) — 0.5 day

Week 3: Phase 5E — UX Polish (parallel with testing tail)
  ├── Proposal -> auto-contract (Anushree) — 1 day
  ├── Raise dispute button + notifications (Bijee/Runa) — 2.5 days
  ├── Server-side search + cleanup (Bijee) — 1 day
  └── Design unification (Bijee) — 1 day

Week 4: Phases 5B + 5C — Security + Infra
  ├── Rate limiting + CORS (Pawan) — 1.5 days
  ├── Key management + JWT (Sarun/Anushree) — 1.5 days
  ├── Dockerize apps (Pawan/Bijee) — 2 days
  └── Env config + deployment guide (Runa) — 1.5 days

Week 5: Phase 5D — Performance + Buffer
  ├── Load testing (Pawan) — 1 day
  ├── Monitoring (Runa) — 1 day
  ├── Real-time messaging (Anushree/Bijee) — 2 days
  └── Final review + bug fixes (All) — 1 day
```

---

## Future Feature Backlog (Post-MVP)

| Feature | Priority | Notes |
|---|---|---|
| Rule-based matching algorithm (FR-5) | Medium | `GET /recommendations/jobs` + `GET /recommendations/freelancers` with skill/budget/category overlap scoring |
| Performance validation benchmarks (FR-6) | Low | Formal latency + availability testing documented in report |
| Freelancer ratings & reviews | Low | `freelancer_ratings` table, star rating after contract completion |
| On-chain reputation system | Low | Contract completion events -> verifiable on-chain score |
| Email notifications | Low | SMTP integration for dispute resolution, contract signed, payment released |
| Two-factor authentication | Low | Optional TOTP for wallet-based accounts |

---

## Architecture Principles

1. **API-first**: Frontend and backend agree on the API contract before writing code
2. **Privacy-first**: Pseudonymous user IDs throughout the system; wallet addresses stored only where architecturally required (auth lookup, on-chain operations)
3. **Hybrid**: Centralized FastAPI for speed; decentralized blockchain for trust
4. **Event-driven**: Backend listens to blockchain events to sync database state
5. **Asynchronous**: FastAPI async handlers prevent thread starvation during blockchain/IPFS calls

---

## Known Issues & Technical Debt

| # | Issue | Severity | Location | Fix Planned? |
|---|---|---|---|---|
| T1 | `database/schema.sql` enum values differ from SQLAlchemy `models.py` | Medium | `database/schema.sql` vs `models/models.py` | Sync schema.sql to match models |
| T2 | PlantUML state machine diagram shows outdated status names | Low | `05_State_Machine.puml` | Update to match `ContractStatus` enum |
| T3 | ExploreJobs search is client-side only | Medium | `ExploreJobs.js` | Add `?q=` query param to API |
| T4 | No "Raise Dispute" button on contract detail page | Medium | `ContractDetailPage.js` | Add button -> modal -> POST |
| T5 | `CLIENT_PRIVATE_KEY` single point of failure | High | `config.py` / `blockchain_service.py` | Document for prod; add multi-key support |
| T6 | Two parallel frontend trees cause confusion | Low | `bijee_frontend/` + main `frontend/` | ✅ Resolved — Queue-15 removed `bijee_frontend/` (redundant demo frontend) |
| T7 | CORS allows all origins (`*`) | Medium | `main.py` line 37 | Restrict to specific origins |
