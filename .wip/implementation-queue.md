# Implementation Queue — FreeLedger

> Ordered by safety: build blockers → startup blockers → critical bugs → requirement gaps → NFRs → tests → docs
> Date: June 17, 2026
> Source: `.wip/master-backlog.md`, `.wip/master-requirements.md`, `.wip/startup-report.md`
> Status: Queues 01–24 ✅ Done — Queues 25–35 pending/stretch

---

## Queue Order

```
Tier 1: Build Blockers ─────── [Queue-01] ✅ Done
Tier 2: Startup Blockers ───── [Queue-02, Queue-03] ✅ Done
Tier 3: Critical Bugs ──────── [Queue-04 → Queue-07] ✅ Done
Tier 4: Documentation Fixes ── [Queue-08 → Queue-11] ✅ Done
Tier 5: Security ───────────── [Queue-12, Queue-13] ✅ Done
Tier 6: Infrastructure ─────── [Queue-14, Queue-15, Queue-34, Queue-35] ✅ Done
Tier 7: Tests ──────────────── [Queue-16, Queue-17, Queue-18] ✅ Done
Tier 8: Feature Gaps ───────── [Queue-19 → Queue-24] ✅ Done
Tier 9: Stretch ────────────── [Queue-25 → Queue-30]
Tier 10: Documentation ─────── [Queue-31 → Queue-33]
```

---

## Legend

Each queue item includes:

| Field | Meaning |
|---|---|
| **Backlog ID** | Reference to `.wip/master-backlog.md` item |
| **Requirement** | Requirement(s) satisfied |
| **Priority** | Why this matters |
| **Reason** | Problem this solves |
| **Effort** | Estimated time |
| **Scope** | Files/modules to touch |
| **Success** | Measurable completion criteria |
| **Depends on** | Must be done before this can start |
| **Status** | Pending / In Progress / Done |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-03 (build must work) |
| **Priority** | HIGHEST — no backend code runs without it |
| **Reason** | `requirements.txt` pins versions that lack Python 3.14 wheels |
| **Effort** | 30 min |
| **Scope** | `backend/requirements.txt` — bump asyncpg, pydantic, pydantic-settings, psycopg2-binary, greenlet, sqlalchemy, pytest, pytest-asyncio; add eth-utils/eth-typing pins |
| **Success** | `pip install -r backend/requirements.txt` succeeds in fresh venv; `pip check` clean |
| **Depends on** | None |
| **Status** | ✅ Done |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-10 (health check) |
| **Priority** | HIGH — only way to run the full stack |
| **Reason** | Backend requires PostgreSQL, Redis, IPFS, Hardhat. Docker compose is the only startup path. |
| **Effort** | 1 hour |
| **Scope** | `backend/Dockerfile` (bump base image), `docker/docker-compose.yml` (verify), `.env` (verify) |
| **Success** | All 5 containers healthy; `curl localhost:8000/api/health` returns JSON; DB/Redis/IPFS show "ok" |
| **Depends on** | Queue-01 |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-16 (backend tests) |
| **Priority** | HIGH — tests cannot run reliably without it |
| **Reason** | Auth tests fail without real Redis/DB. Need in-memory SQLite and fake Redis for test isolation. |
| **Effort** | 2 hours |
| **Scope** | `tests/backend/conftest.py` (FakeRedis, env var override, dep overrides), `tests/backend/test_auth.py` (fixtures), `tests/backend/test_ipfs.py` (fix for running IPFS), `backend/requirements.txt` (add aiosqlite) |
| **Success** | `pytest tests/backend/` — 11 pass, 0 fail, 6 pre-existing errors (Ganache only) |
| **Depends on** | Queue-01 |
| **Status** | ✅ Done |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-11, SEC-05, CAP-01 |
| **Priority** | CRITICAL — documentation contradicts implementation; academic integrity risk |
| **Reason** | `data-flow.md` claims wallet addresses are never stored; `models.py` stores `wallet_address` in plaintext |
| **Effort** | 1-2 days |
| **Scope** | Option A: Hash addresses — modify `models.py` (store hash), `routers/auth.py` (hash on login/register), update tests. Option B: Fix docs — update `data-flow.md` and sprint plan to match reality. |
| **Success** | (1) No plaintext addresses in DB, OR docs accurately describe storage. (2) MetaMask login still works. (3) All tests pass. |
| **Depends on** | Queue-03 (reliable tests) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | UI-04, GAP-15 |
| **Priority** | HIGH — admin usability broken |
| **Reason** | Admin messages tab is empty on mount — missing `useEffect` data load call |
| **Effort** | 30 min |
| **Scope** | `frontend/src/pages/AdminPanel.js` (add parallel messages fetch to `loadAll`) |
| **Success** | Admin messages tab loads conversations on mount; no console errors |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | FR-05, GAP-07 |
| **Priority** | HIGH — core user-facing feature missing |
| **Reason** | Job list lacks `?search=` query param; users cannot search jobs server-side |
| **Effort** | 2 hours |
| **Scope** | `backend/app/routers/jobs.py` (add ILIKE filter on title/description), `frontend/src/` (update search input to use API param) |
| **Success** | `GET /jobs?search=term` returns filtered results; case-insensitive; frontend uses API param |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-09, GAP-08, C-07 |
| **Priority** | HIGH — API spec promises `code` field; all responses omit it |
| **Reason** | Client-side error handling cannot distinguish error types without machine-readable codes |
| **Effort** | 3 hours |
| **Scope** | `backend/app/utils/exceptions.py` (add error code constants + `code` field), `backend/app/middleware/error_handler.py` (inject code in responses), update all exception raises |
| **Success** | (1) Error codes defined. (2) All error responses include `code` field. (3) Frontend can distinguish error types by code. |
| **Depends on** | Queue-03 (reliable tests) |
| **Status** | ✅ Done — `backend/app/utils/error_codes.py` created with 61 error codes (AUTH, AUTHZ, NOT_FOUND, VALIDATION, BLOCKCHAIN, IPFS, INTERNAL). Used across all routers and services. Error responses include `code` field. Frontend can distinguish error types by code. |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | CAP-01, GAP-03 |
| **Priority** | HIGH — documentation contradiction; academic integrity |
| **Reason** | `database/schema.sql` enum values differ from Python `models.py` enum classes |
| **Effort** | 1 hour |
| **Scope** | `database/schema.sql` — update enum definitions to match `backend/app/models/models.py` exactly |
| **Success** | All enum values in `schema.sql` exactly match `models.py` |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | CAP-01, GAP-13 |
| **Priority** | HIGH — orphan tables in schema, missing tables in SQL |
| **Reason** | `schema.sql` defines `admin_accounts` and `session_audit` tables not in `models.py`; some model tables missing from SQL |
| **Effort** | 2 hours |
| **Scope** | `database/schema.sql` (add missing tables, remove orphan tables OR add models), `backend/app/models/models.py` (add models if keeping tables) |
| **Success** | Schema SQL and Python models define exactly the same set of tables |
| **Depends on** | Queue-08 (fix enums first — same file) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-13, CAP-01, GAP-02 |
| **Priority** | HIGH — sprint claim contradicts code |
| **Reason** | Sprint plan claims "Alembic ✅ Done"; code uses `Base.metadata.create_all()` |
| **Effort** | 4 hours |
| **Scope** | Option A: Implement Alembic — `alembic init`, create initial migration, wire into `lifespan` in `main.py`. Option B: Update docs — change sprint plan, add note to `database.py`. |
| **Success** | (1) `create_all()` replaced with Alembic OR documented as intentional. (2) If Alembic: migrations run on startup. (3) All tables created. |
| **Depends on** | Queue-08, Queue-09 (schema alignment first) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | GAP-14 (code quality) |
| **Priority** | MEDIUM — deprecation warnings in Python 3.14 |
| **Reason** | `contract_service.py` uses deprecated `datetime.utcnow()`; will break in Python 3.16 |
| **Effort** | 30 min |
| **Scope** | `backend/app/services/contract_service.py` — replace `utcnow()` with `datetime.now(timezone.utc)` |
| **Success** | All `utcnow()` replaced; no deprecation warnings in test output |
| **Depends on** | None |
| **Status** | ✅ Done |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | SEC-06, NFR-14, GAP-12 |
| **Priority** | HIGH — single key controls all on-chain funds |
| **Reason** | Single `CLIENT_PRIVATE_KEY` for all ops. If compromised, all escrow funds are at risk. |
| **Effort** | 1 day |
| **Scope** | `backend/app/services/blockchain_service.py` (document risk), `backend/app/config.py` (add multi-key config option), `docs/generated/PRODUCTION_GUIDE.md` (multi-key recommendations) |
| **Success** | (1) Risk clearly documented in code and deployment docs. (2) Multi-key or external signer path defined. (3) No regression in existing functionality. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-08 |
| **Priority** | MEDIUM — blockchain calls can hang indefinitely |
| **Reason** | Web3 calls via `contract.functions.*.transact()` lack explicit timeouts. A stalled node can hang requests forever. |
| **Effort** | 4 hours |
| **Scope** | `backend/app/services/blockchain_service.py` (add request_timeout to all Web3 calls), `backend/app/config.py` (add `BLOCKCHAIN_TIMEOUT` setting) |
| **Success** | (1) All Web3 calls have configurable timeouts. (2) Timeout errors are caught and return appropriate HTTP 503. (3) `settings.blockchain_timeout` controls default. |
| **Depends on** | None |
| **Status** | ✅ Done — `backend/app/config.py` has `blockchain_timeout: int = 30` and `blockchain_tx_timeout: int = 120`. `blockchain_service.py` applies `request_kwargs={"timeout": settings.blockchain_timeout}` to all Web3 HTTP calls and `timeout=settings.blockchain_tx_timeout` to `wait_for_transaction_receipt`. Timeout errors caught → HTTP 503. |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | CAP-03, GAP-06 |
| **Priority** | HIGH — no frontend container image exists |
| **Reason** | Frontend requires `npm start` manually. Cannot deploy as a unit with `docker compose up`. |
| **Effort** | 1 day |
| **Scope** | `frontend/Dockerfile` (multi-stage: node build → nginx serve), `docker/docker-compose.yml` (add frontend service), `docker/nginx.conf` (reverse proxy config) |
| **Success** | (1) `frontend/Dockerfile` exists. (2) Frontend service in docker-compose. (3) `docker compose up` serves frontend. |
| **Depends on** | Queue-03 (reliable tests to verify no regression) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | GAP-09 (code quality) |
| **Priority** | HIGH — stale code causes confusion |
| **Reason** | `bijee_frontend/` contains duplicate/stale HTML/CSS/JS that overlaps with `frontend/`. Must audit and remove. |
| **Effort** | 1 day |
| **Scope** | `bijee_frontend/` — audit for unique functionality, migrate anything valuable to `frontend/`, then remove directory |
| **Success** | (1) All unique functionality preserved in `frontend/`. (2) `bijee_frontend/` removed. (3) No regression. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | Code quality |
| **Priority** | MEDIUM — no linting/formatting configured |
| **Reason** | No `.flake8`, `.pylintrc`, or formatter config in backend. Code style drifts without enforcement. |
| **Effort** | 2 hours |
| **Scope** | `backend/pyproject.toml` (ruff config), `backend/requirements.txt` (add ruff), `backend/app/routers/admin.py` (formatting fixes) |
| **Success** | (1) Linter config exists. (2) `ruff check backend/` passes. (3) No functional changes. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | SEC-01, SEC-04 (indirect) |
| **Priority** | LOW — 61 vulnerabilities (20 high), all from react-scripts transitive deps |
| **Reason** | `npm audit` reports 61 vulnerabilities. While all are transitive, high-severity issues should be documented or mitigated. |
| **Effort** | 1 hour |
| **Scope** | Run `npm audit`, document findings, consider `package.json` overrides or `npm audit fix` |
| **Success** | Vulnerabilities documented; either fixed or accepted-risk noted in project docs |
| **Depends on** | None |
| **Status** | ✅ Done |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-16, CAP-02, GAP-05 |
| **Priority** | HIGH — critical backend services untested |
| **Reason** | Missing tests for contract service (create, sign, fund, milestone), messaging (conversations, send, read), proposals (submit, accept/reject), admin CRUD, auth edge cases (expired tokens, invalid sigs, duplicate wallets) |
| **Effort** | 3 days |
| **Scope** | `tests/backend/test_contracts.py`, `tests/backend/test_messages.py`, `tests/backend/test_proposals.py`, `tests/backend/test_admin.py`, `tests/backend/test_auth_edge.py` |
| **Success** | (1) Contract service test suite. (2) Messaging test suite. (3) Proposal test suite. (4) Admin CRUD tests. (5) Auth edge case tests. (6) All pass. |
| **Depends on** | Queue-03 (test infrastructure), Queue-13 (blockchain timeouts — prevents flaky tests) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | NFR-15, CAP-02, GAP-04 |
| **Priority** | HIGH — zero frontend tests exist |
| **Reason** | No Jest/react-testing-library configured. Key components (ProposalForm, Dashboards, ContractDetailPage) untested. |
| **Effort** | 1.5 days |
| **Scope** | `frontend/package.json` (add Jest + RTL deps), `frontend/src/setupTests.js`, `frontend/src/**/*.test.js` (≥5 component tests) |
| **Success** | (1) Jest + RTL configured. (2) ≥5 component tests. (3) `npm test` passes. |
| **Depends on** | Queue-15 (clean up frontend trees first — avoids testing stale code) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | TEST-11 |
| **Priority** | MEDIUM — basic test coverage exists, edge cases missing |
| **Reason** | Hardhat tests cover happy path state transitions. Missing: reentrancy attack, integer overflow, unauthorized access, platform fee edge cases. |
| **Effort** | 0.5 day |
| **Scope** | `contracts/test/GigEscrow.test.js` (24 existing), `contracts/test/GigEscrowEdgeCases.test.js` (46 new), `contracts/contracts/test/MaliciousReceiver.sol` (reentrancy test harness) |
| **Success** | (1) Edge case tests pass. (2) Coverage improved for reentrancy/overflow/unauthorized paths. |
| **Depends on** | None |
| **Status** | ✅ Done — 70 total tests, 46 new edge-case tests, 0 failing, 3 consecutive runs stable |

**Completion summary:**
- **Authorization tests (10)**: Non-client cancel, unauthorized dispute, owner dispute access, non-existent contract access (fund/submit/approve/dispute/cancel/resolve/query)
- **State transition tests (11)**: Pre-funding approval, pre-funding submission, double-funding, double-approve, submit on completed/cancelled, post-funding cancel, completed cancel, no-dispute resolve, dispute on completed/cancelled, non-submitted reject
- **Reentrancy tests (4)**: nonReentrant on approveMilestone/resolveDispute/cancelContract verified; transfer() gas limitation demonstrated
- **Arithmetic tests (4)**: Zero-value milestones, 2.5% fee calculation verified with balances, wei-level values, BPS boundary values
- **Failure recovery tests (6)**: Invalid milestone index (submit/approve/details), empty title, empty terms CID, re-submit on funded milestone
- **Event validation tests (9)**: MilestoneAdded per-index, ContractCreated params, MilestoneSubmitted params, MilestoneApproved payout, MilestoneRejected index, ContractCompleted, ContractCancelled, DisputeRaised raisedBy, DisputeResolved winner
- **Balance query tests (2)**: Post-funding balance, unfunded zero balance
- **Coverage**: GigEscrow.sol — 100% stmts, 91.84% branch, 100% funcs, 100% lines
- **Reentrancy assessment**: OpenZeppelin ReentrancyGuard protects approveMilestone/resolveDispute/cancelContract; .transfer() (2300 gas) provides additional gas-level protection; no unprotected external calls found

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | FR-19 |
| **Priority** | MEDIUM — prerequisite for freelancer directory |
| **Reason** | User model needs `headline`, `experience_level`, `industries`, `is_available`, `portfolio_cids` fields |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/models/models.py` (add fields), `backend/app/schemas/schemas.py` (update Pydantic), `database/schema.sql` (sync) |
| **Success** | (1) New fields in User model. (2) Pydantic schemas include them. (3) Migration/schema aligned. |
| **Depends on** | Queue-10 ✅ (migration strategy resolved — Alembic migrations operational) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
||| **Requirement** | FR-20, UI-06 |
||| **Priority** | MEDIUM — new feature: browse freelancers |
||| **Reason** | No `GET /users/` endpoint with filters. Clients cannot discover freelancers. |
| **Effort** | 1 day |
|| **Scope** | `backend/app/routers/users.py` (add `GET /users/` with query filters: role, search, skills, experience_level, is_available, min_rate, max_rate), add pagination |
|| **Success** | (1) All query filters work. (2) Paginated response. (3) Tests pass. |
|| **Depends on** | Queue-19 (model fields first) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | FR-21, FR-22, UI-06 |
| **Priority** | MEDIUM — new UI: freelancer browsing |
| **Reason** | No frontend for freelancer directory. Users need search, filter, cards, invite flow. |
| **Effort** | 1.5 days |
| **Scope** | `frontend/src/pages/FreelancerDirectory.js` (search bar, filter row, freelancer cards, invite button), `frontend/src/App.js` (add `/freelancers` route with `ClientRoute` guard), navbar link |
| **Success** | (1) Page renders with search/filter. (2) Invite button opens modal. (3) Route guarded by `ClientRoute`. |
| **Depends on** | Queue-20 (backend first) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | FR-23 |
| **Priority** | LOW — nice-to-have discovery feature |
| **Reason** | No skill-matching endpoint for freelancer recommendations |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/routers/recommendations.py` (add `GET /recommendations/people` that matches by overlapping skills) |
| **Success** | (1) Endpoint returns users ordered by skill overlap count. (2) Tests pass. |
| **Depends on** | Queue-20 (uses same `/users/` query infrastructure) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | UI-08 |
| **Priority** | LOW — UX enhancement |
| **Reason** | When a freelancer submits a proposal, no message thread is created. Client and freelancer must manually start a conversation. |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/routers/proposals.py` (after successful proposal submission, auto-create message thread with system message: "[Name] submitted proposal for [Job] — Bid: X ETH") |
| **Success** | (1) On proposal submit, message thread created. (2) System message delivered to thread. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | UI-07 |
| **Priority** | LOW — UX polish |
| **Reason** | Chat UI lacks search filter, relative timestamps, clear unread indicators |
| **Effort** | 1 day |
| **Scope** | `frontend/src/pages/Messages.js`, `frontend/src/utils/timeAgo.js`, `frontend/src/css/styles.css` — add conversation search by username, headline, and message content; replace timestamps with relative ("2 minutes ago"); improve unread indicators with bold highlight and dot badge; auto-scroll improvements; new message highlight animation |
| **Success** | (1) Search filters conversations by name, headline, and message content. (2) Timestamps shown as relative text ("just now", "3 minutes ago", "1 hour ago", "Yesterday"). (3) Unread indicators clear: bold highlight, dot for single unread, badge for 2+. (4) Auto-scroll works smoothly, preserves position when scrolled up. |
| **Depends on** | None |
| **Status** | ✅ Done — Enhanced chat UI implemented (search, relative timestamps, unread indicators, scroll improvements). |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | GAP-10, FR-14 (enhancement) |
| **Priority** | LOW — poll-based messaging works, real-time is polish |
| **Reason** | Current messaging uses polling. Real-time delivery (Redis pub/sub + WebSocket) eliminates 3s refresh delay. |
| **Effort** | 2 days |
| **Scope** | `backend/app/routers/messages.py` (add WebSocket endpoint), `backend/app/services/message_service.py` (Redis pub/sub publish), `frontend/src/` (WebSocket event emitter, auto-refresh on new message) |
| **Success** | (1) Real-time message delivery. (2) No polling required for new messages. (3) Existing REST API continues to work. |
| **Depends on** | Queue-16 (messaging tests first — ensures regression detection) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | GAP-11, UI-09 |
| **Priority** | LOW — no notification infrastructure exists |
| **Reason** | No `Notification` model, no backend triggers, no frontend bell icon |
| **Effort** | 2 days |
| **Scope** | `backend/app/models/models.py` (Notification model), `backend/app/schemas/schemas.py` (NotificationResponse), triggers on proposal/contract/dispute events, `frontend/src/` (bell icon, unread badge, dropdown) |
| **Success** | (1) Notifications table exists. (2) Triggers on key events (proposal, contract, dispute, milestone). (3) Bell icon with badge and dropdown list. |
| **Depends on** | Queue-25 (reuses WebSocket infrastructure for real-time delivery) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | TEST-13, NFR-08 (partial) |
| **Priority** | LOW — no request timing infrastructure |
| **Reason** | No middleware measures API response times; slow endpoints go undetected |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/middleware/timing.py` (request timing middleware emitting logs for responses > 5s) |
| **Success** | (1) Middleware measures and logs response times. (2) Slow endpoint warnings in logs. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | TEST-14, NFR-10 (expansion) |
| **Priority** | LOW — IPFS health in `/api/health` exists but no standalone monitor |
| **Reason** | No script/endpoint to proactively alert when IPFS node is unreachable |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/services/health_service.py` (expand IPFS check), or standalone script for periodic ping |
| **Success** | (1) IPFS availability monitoring script or enhanced check. (2) Alert mechanism defined. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | TEST-15 |
| **Priority** | LOW — event listener has no heartbeat |
| **Reason** | Event listener polls silently; if it stops, no one notices until data goes stale |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/services/event_listener.py` (add heartbeat timestamp updated on each poll), `backend/app/routers/health.py` (report last poll time in health check) |
| **Success** | (1) Event listener heartbeat metric stored. (2) `/api/health` reports last poll time. (3) Alert criteria defined (missed polls > 60s). |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | SEC-01 (enhancement) |
| **Priority** | LOW — single secret works for dev, rotation is production need |
| **Reason** | Only one `JWT_SECRET` supported. Rotating secrets would invalidate all active tokens immediately. |
| **Effort** | 0.5 day |
| **Scope** | `backend/app/config.py` (add `JWT_SECRETS` — list of valid secrets), `backend/app/services/auth_service.py` (try each secret on decode) |
| **Success** | (1) Multiple valid secrets supported during rotation window. (2) Tokens signed with old secret still work after rotation until they expire. |
| **Depends on** | None |
| **Status** | Pending |

---

|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | Developer experience |
| **Priority** | MEDIUM — missing env vars slow onboarding |
| **Reason** | `.env.example` files are incomplete; some variables lack descriptions or safe defaults |
| **Effort** | 1 hour |
| **Scope** | `backend/.env.example`, `frontend/.env.example` — add all env vars with descriptions and safe dev defaults |
| **Success** | (1) All env vars documented in examples. (2) Safe defaults for local development. |
| **Depends on** | None |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | CAP-01 |
| **Priority** | HIGH — academic integrity; sprint plan has false completion claims |
| **Reason** | Sprint plans claim features done that aren't (Alembic, wallet address privacy, etc.). Must correct after code fixes. |
| **Effort** | 2 hours |
| **Scope** | `.wip/master-sprint.md`, `docs/plans/sprint-plans.md`, `docs/generated/CAPSTONE_REVIEW.md` — update to reflect actual completion status |
| **Success** | (1) Sprint plan accurately reflects current project reality. (2) All false completion claims corrected. |
| **Depends on** | Queue-04 ✅, Queue-08 ✅, Queue-10 ✅ (resolved — all documentation contradictions fixed) |
|| **Status** | ✅ Done — `GET /users/` endpoint implemented with role, search, skills, experience_level, is_available, min_rate, max_rate filters plus pagination. Tests pass. |

### Queue-21: Implement Freelancer Directory Frontend (MB-016)

|| Field | Value |
|---|---|
|| **Backlog ID** | MB-016 |
| **Requirement** | CAP-03 |
| **Priority** | MEDIUM — no deployment documentation exists |
| **Reason** | No step-by-step guide for deploying FreeLedger to production. Only local Docker Compose is documented. |
| **Effort** | 1 day |
| **Scope** | `docs/generated/DEPLOYMENT_GUIDE.md` — cover: prerequisites, Docker Compose (dev), production (reverse proxy, SSL, env vars), smart contract deployment, infrastructure requirements |
| **Success** | (1) Deployment guide written. (2) Covers dev and production environments. (3) Includes smart contract deployment steps. |
| **Depends on** | Queue-14 ✅ (frontend Docker — container exists) |
| **Status** | Pending |

---

## Queue Summary

| Queue | Backlog ID | Task | Effort | Depends On | Status |
|---|---|---|---|---|---|
| 01 | SB-01 | Python 3.14 compatibility | 30 min | — | ✅ Done |
| 02 | SB-04 | Verify Docker Compose startup | 1 hour | 01 | ✅ Done |
| 03 | MB-005p | Fix test environment | 2 hours | 01 | ✅ Done |
| 04 | MB-001 | Fix wallet address privacy | 1-2 days | 03 | ✅ Done |
| 05 | MB-013 | Fix admin messages tab | 30 min | — | ✅ Done |
| 06 | MB-010 | Add server-side job search | 2 hours | — | ✅ Done |
| 07 | MB-011 | Add error codes to API | 3 hours | 03 | ✅ Done |
| 08 | MB-003 | Fix schema enum mismatch | 1 hour | — | ✅ Done |
| 09 | MB-008 | Align schema tables with models | 2 hours | 08 | ✅ Done |
| 10 | MB-002 | Fix database migration strategy | 4 hours | 09 | ✅ Done |
| 11 | MB-021 | Fix deprecated utcnow() | 30 min | — | ✅ Done |
| 12 | MB-006 | Fix private key SPOF | 1 day | — | ✅ Done |
| 13 | MB-014 | Add blockchain call timeouts | 4 hours | — | ✅ Done |
| 14 | MB-009 | Create frontend Dockerfile | 1 day | 03 | ✅ Done |
| 15 | MB-012 | Clean up redundant frontend trees | 1 day | — | ✅ Done |
| 34 | SB-02 | Configure backend linting | 2 hours | — | ✅ Done |
| 35 | SB-03 | Audit frontend npm vulnerabilities | 1 hour | — | ✅ Done |
| 16 | MB-005 | Add missing backend service tests | 3 days | 03, 13 | ✅ Done |
| 17 | MB-004 | Add frontend component tests | 1.5 days | 15 | ✅ Done |
| 18 | MB-028 | Smart contract edge case tests | 0.5 day | — | ✅ Done |
|| 19 | MB-017 | Add user model fields | 0.5 day | 10 | ✅ Done |
|| 20 | MB-015 | Freelancer directory backend | 1 day | 19 | ✅ Done |
|| 21 | MB-016 | Freelancer directory frontend | 1.5 days | 20 | ✅ Done |
| 22 | MB-018 | People you may know endpoint | 0.5 day | 20 | ✅ Done |
| 23 | MB-019 | Proposal-to-message auto-thread | 0.5 day | — | ✅ Done |
| 24 | MB-020 | Enhanced chat UI | 1 day | — | ✅ Done |
| 25 | MB-023 | Real-time messaging | 2 days | 16 | Pending |
| 26 | MB-024 | Notifications system | 2 days | 25 | Pending |
| 27 | MB-025 | API response time monitoring | 0.5 day | — | Pending |
| 28 | MB-026 | IPFS availability monitoring | 0.5 day | — | Pending |
| 29 | MB-027 | Event listener health monitoring | 0.5 day | — | Pending |
| 30 | MB-029 | JWT secret rotation support | 0.5 day | — | Pending |
| 31 | MB-022 | Complete .env.example docs | 1 hour | — | ✅ Done |
| 32 | MB-007 | Update sprint plan documentation | 2 hours | 04, 08, 10 | Pending |
| 33 | MB-030 | Write deployment guide | 1 day | 14 | Pending |

**Total remaining effort**: ~7-9 developer-days (Queues 01–24 ✅ Done; Queues 25–33 remaining: 25, 26, 27, 28, 29, 30, 32, 33)

---

## Dependency Graph (Simplified)

```
Tier 1 (Build) ──→ Tier 2 (Startup) ──→ Tier 3 (Bugs) ──→ Tiers 4-10
                     │                       │
                     │    ┌───────────────────┤
                     │    │                   │
                     v    v                   v
                  Queue-03              Queue-04, 07
                  (tests)               (need stable tests)
                     │
                     ├──→ Queue-14 (frontend Docker)
                     ├──→ Queue-16 (backend tests)
                     │
                     v
                  Queue-13 (timeouts) ──→ Queue-16 (backend tests)
                                             │
                                             └──→ Queue-25 (real-time)
                                                    │
                                                    └──→ Queue-26 (notifications)
```

## Queue Readiness Exit Criteria

The implementation queue is considered ready for sprint execution when:

- [x] All backlog items (MB-001 through MB-030) mapped to a queue entry
- [x] Every queue entry has: priority, reason, effort estimate, scope, success criteria, dependencies
- [x] Tier ordering is validated: build blockers → startup → bugs → docs → security → infra → tests → features → stretch → docs
- [x] Dependencies are acyclic and consistent with `.wip/master-backlog.md`
- [x] Execution order prioritizes safety (low-risk/no-code first)
- [x] Sprint mapping exists — each queue item tagged to a sprint
- [x] Total effort is estimated (~20-24 days remaining)

**Status**: ✅ All criteria met — queue is ready for sprint execution

---

## Sprint Mapping

Each queue item is tagged to its target sprint from `.wip/master-sprint.md`. Items without explicit sprint are "best-fit" based on dependencies and type.

| Sprint | Focus | Queue Items | Tags |
|---|---|---|---|
| Sprint 1 | Documentation Integrity & Security | Queue-08 ✅, Queue-09 ✅, Queue-10 ✅, Queue-12 ✅, Queue-04 ✅, Queue-32 | [docs] [security] |
| Sprint 2 | User-Facing Fixes & Infrastructure | Queue-05 ✅, Queue-06 ✅, Queue-11 ✅, Queue-07 ✅, Queue-14 ✅, Queue-15 ✅, Queue-34 ✅, Queue-35 ✅ | [frontend] [backend] [infra] |
| Sprint 3 | Testing Core | Queue-13 ✅, Queue-16 ✅, Queue-17 ✅, Queue-18 ✅, Queue-27, Queue-28, Queue-29, Queue-30 | [test] [backend] [contracts] |
|| Sprint 4 | Freelancer Discovery | Queue-19 ✅, Queue-20 ✅, Queue-21 ✅, Queue-22 ✅, Queue-23 ✅, Queue-24 ✅ | [backend] [frontend] |
| Sprint 5 | Stretch & Polish | Queue-25, Queue-26, Queue-31 ✅, Queue-33 | [backend] [frontend] [docs] |
| Sprint 6 | Documentation Reconciliation | Queue-32 | [docs] |

Queue-01, Queue-02, Queue-03 are ✅ Done — completed before sprint execution began.

---

## Label Reference

| Label | Meaning |
|---|---|
| [backend] | Modifies Python/FastAPI code in `backend/` |
| [frontend] | Modifies React code in `frontend/` |
| [infra] | Docker, CI/CD, deployment configuration |
| [docs] | Documentation only — no code changes |
| [test] | Adds or fixes automated tests |
| [contracts] | Solidity/Hardhat smart contract code |
| [security] | Authentication, authorization, cryptography |

---

## Recommended Execution Order

Start here after Queue-03. This order prioritizes safety: docs-only first, then trivial fixes, then straightforward features, then complex/critical items. Items with no code changes are queued earliest so the team builds context before touching production code.

### Phase A: Quick Wins & Docs — ✅ ALL DONE

```
Step 1:  Queue-08 (MB-003) — schema enum sync            1 hr     [docs] ✅
Step 2:  Queue-09 (MB-008) — schema tables align         2 hrs    [docs] ✅
Step 3:  Queue-05 (MB-013) — admin messages tab          30 min   [frontend] ✅
Step 4:  Queue-11 (MB-021) — utcnow() fix                30 min   [backend] ✅
Step 5:  Queue-31 (MB-022) — .env.example docs           1 hr     [docs] ✅
Step 6:  Queue-34 (SB-02)  — backend linting config      2 hrs    [infra] ✅
Step 7:  Queue-35 (SB-03)  — npm vulnerability audit     1 hr     [infra] ✅
```

### Phase B: Backend Features & Security — ✅ ALL DONE

```
Step 8:  Queue-06 (MB-010) — server-side job search      2 hrs    [backend][frontend] ✅
Step 9:  Queue-10 (MB-002) — database migration strategy 4 hrs    [backend][docs] ✅
Step 10: Queue-13 (MB-014) — blockchain call timeouts    4 hrs    [backend][security] ✅
Step 11: Queue-04 (MB-001) — wallet address privacy     1-2 days  [backend][security] ✅
Step 12: Queue-07 (MB-011) — error codes to API          3 hrs    [backend] ✅
Step 13: Queue-12 (MB-006) — private key documentation   1 day    [backend][security][docs] ✅
Step 14: Queue-14 (MB-009) — frontend Dockerfile         1 day    [infra] ✅
Step 15: Queue-15 (MB-012) — cleanup frontend trees      1 day    [frontend][infra] ✅
```

### Phase C: Tests (stretch pending)

```
Step 16: Queue-18 (MB-028) — contract edge case tests    0.5 day  [contracts] ✅
Step 17: Queue-27 (MB-025) — API response monitoring     0.5 day  [backend][test]
Step 18: Queue-28 (MB-026) — IPFS monitoring             0.5 day  [backend][test]
Step 19: Queue-29 (MB-027) — event listener health       0.5 day  [backend][test]
Step 20: Queue-30 (MB-029) — JWT rotation support        0.5 day  [backend][security]
Step 21: Queue-16 (MB-005) — backend service tests       3 days   [test] ✅
Step 22: Queue-17 (MB-004) — frontend component tests   1.5 days  [test][frontend] ✅
```

### Phase D: Feature Gaps — ✅ ALL DONE

```
Step 23: Queue-19 (MB-017) — user model fields          0.5 day   [backend] ✅
Step 24: Queue-20 (MB-015) — freelancer backend          1 day    [backend] ✅
Step 25: Queue-21 (MB-016) — freelancer frontend        1.5 days  [frontend] ✅
Step 26: Queue-22 (MB-018) — people you may know        0.5 day   [backend] ✅
Step 27: Queue-23 (MB-019) — proposal→message thread    0.5 day   [backend] ✅
Step 28: Queue-24 (MB-020) — enhanced chat UI            1 day    [frontend] ✅
```

### Phase E: Documentation Reconciliation

```
Step 29: Queue-32 (MB-007) — update sprint plan docs     2 hrs    [docs] ✅
```

### Phase F: Stretch & Polish

```
Step 30: Queue-25 (MB-023) — real-time messaging         2 days   [backend][frontend]
Step 31: Queue-26 (MB-024) — notifications system        2 days   [backend][frontend]
Step 32: Queue-33 (MB-030) — deployment guide            1 day    [docs]
Step 33: Queue-27 (MB-025) — API response monitoring     0.5 day  [backend][test]
Step 34: Queue-28 (MB-026) — IPFS monitoring             0.5 day  [backend][test]
Step 35: Queue-29 (MB-027) — event listener health       0.5 day  [backend][test]
Step 36: Queue-30 (MB-029) — JWT rotation support        0.5 day  [backend][security]
```

**Total remaining**: ~7-9 developer-days across 8 pending steps (Queues 25-30, 33).
