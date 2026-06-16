# Development Backlog

> Generated from: `REQUIREMENTS_AUDIT.md`, `GAP_ANALYSIS.md`, `CAPSTONE_REVIEW.md`
> Date: June 16, 2026

---

## Task Index

| ID | Priority | Gap/Req | Effort | Phase |
|---|---|---|---|---|
| T-001 | P0 - Critical | GAP-01 | 1-2 days | Phase 1 |
| T-002 | P1 - High | GAP-02 | 4 hours | Phase 1 |
| T-003 | P1 - High | GAP-03 | 1 hour | Phase 1 |
| T-004 | P1 - High | GAP-04 | 1.5 days | Phase 4 |
| T-005 | P1 - High | GAP-05 | 3 days | Phase 4 |
| T-006 | P2 - Medium | GAP-06 | 1 day | Phase 3 |
| T-007 | P2 - Medium | GAP-07 | 2 hours | Phase 2 |
| T-008 | P2 - Medium | GAP-08 | 3 hours | Phase 3 |
| T-009 | P2 - Medium | GAP-09 | 1 day | Phase 3 |
| T-010 | P3 - Low | GAP-10 | 2 days | Phase 6 |
| T-011 | P3 - Low | GAP-11 | 2 days | Phase 6 |
| T-012 | P1 - High | GAP-12 | 1 day | Phase 1 |
| T-013 | P2 - Medium | GAP-13 | 2 hours | Phase 3 |
| T-014 | P3 - Low | GAP-14 | 30 min | Phase 5 |
| T-015 | P2 - Medium | GAP-15 | 30 min | Phase 2 |
| T-016 | P2 - Medium | NFR-08 | 4 hours | Phase 3 |
| T-017 | P3 - Low | Sprint 1E | 1 hour | Phase 5 |
| T-018 | P1 - High | CAP Review | 2 hours | Phase 1 |

---

## Task Details

### T-001: Fix Wallet Address Privacy Contradiction

| Field | Value |
|---|---|
| **Source** | GAP-01, NFR-11 |
| **Description** | Documentation claims wallet addresses are never stored in DB; code stores them in `users.wallet_address`. Either hash addresses before storage (with one-way SHA-256 + salt) and discard the raw address after JWT issuance, OR update documentation to match actual design. |
| **Files** | `backend/app/models/models.py:81`, `backend/app/routers/auth.py:54`, `docs/architecture/data-flow.md:277-279` |
| **Priority** | P0 - Critical |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Wallet addresses are either hashed before storage or documentation is corrected. (2) Login flow continues to work with MetaMask. (3) No regression in wallet-based authentication. (4) All tests pass. |

### T-002: Fix Database Migration Strategy

| Field | Value |
|---|---|
| **Source** | GAP-02, NFR-13 |
| **Description** | Sprint plan claims Alembic migrations are done; code uses `Base.metadata.create_all()`. Either properly integrate Alembic (run `alembic upgrade head` on startup, remove `create_all()`), OR update documentation to say "auto-create". |
| **Files** | `backend/app/database.py:15-16`, `docs/plans/sprint-plans.md` |
| **Priority** | P1 - High |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) `create_all()` is replaced or documented. (2) If using Alembic: `alembic upgrade head` runs on startup. (3) All tables still created correctly. (4) Documentation matches implementation. |

### T-003: Align Schema Enums with Python Models

| Field | Value |
|---|---|
| **Source** | GAP-03 |
| **Description** | SQL enums in `database/schema.sql` use different casing/values than Python enum classes in `models.py`. Update SQL to match Python models exactly. |
| **Files** | `database/schema.sql`, `backend/app/models/models.py` (JobStatus, ProposalStatus, ContractStatus, MilestoneStatus, DisputeStatus, DisputeDecision) |
| **Priority** | P1 - High |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) All enum values in `schema.sql` exactly match `models.py`. (2) No contradictory enum definitions. |

### T-004: Add Frontend Component Tests

| Field | Value |
|---|---|
| **Source** | GAP-04, NFR-15 |
| **Description** | Zero frontend tests exist. Add Jest + React Testing Library, implement tests for critical components: ProposalForm, Dashboards, ContractDetailPage. |
| **Files** | `tests/frontend/`, `frontend/package.json` (needs devDependencies) |
| **Priority** | P1 - High |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Jest + React Testing Library configured in `frontend/package.json`. (2) At least 5 component tests covering: Auth components, ProposalForm, Dashboard (client), Dashboard (freelancer), ContractDetailPage. (3) `npm test` runs and passes. |

### T-005: Add Missing Backend Service Tests

| Field | Value |
|---|---|
| **Source** | GAP-05, NFR-16 |
| **Description** | Missing unit tests for contract service, messaging, proposals, admin endpoints, auth edge cases. Add comprehensive test coverage. |
| **Files** | `tests/backend/` |
| **Priority** | P1 - High |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Contract service tests: create, sign, fund, milestone approve/reject. (2) Messaging tests: send message, conversations, unread count. (3) Proposal tests: submit, accept, reject. (4) Admin tests: stats, CRUD operations, dispute resolution. (5) Auth edge cases: expired token, invalid signature, duplicate wallet. (6) All tests pass. |

### T-006: Create Frontend Dockerfile

| Field | Value |
|---|---|
| **Source** | GAP-06 |
| **Description** | No frontend Docker image exists. Create `frontend/Dockerfile` with Nginx serving the production build. Add frontend service to `docker/docker-compose.yml`. |
| **Files** | `frontend/` (new Dockerfile), `docker/docker-compose.yml` |
| **Priority** | P2 - Medium |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) `frontend/Dockerfile` exists (multi-stage: node build + nginx serve). (2) Frontend service in `docker-compose.yml`. (3) `docker compose up` serves frontend without manual `npm start`. |

### T-007: Add Server-Side Job Search

| Field | Value |
|---|---|
| **Source** | GAP-07, FR-05 |
| **Description** | Job list endpoint has no `?q=` search parameter. Add server-side search on title and description using `ilike`. Update frontend to use server-side search. |
| **Files** | `backend/app/routers/jobs.py:39-76` |
| **Priority** | P2 - Medium |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) `GET /api/jobs?search=term` returns filtered results. (2) Search covers title and description. (3) Case-insensitive. (4) Existing filters still work. (5) Frontend search uses API param. |

### T-008: Add Error Codes to API Responses

| Field | Value |
|---|---|
| **Source** | GAP-08, NFR-09 |
| **Description** | API spec promises `code` field in error responses but only `detail` is returned. Add error code constants and include them in all exception responses. |
| **Files** | `backend/app/utils/exceptions.py`, all routers |
| **Priority** | P2 - Medium |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Error codes defined for all error types. (2) All error responses include `code` field. (3) Response shape is `{"detail": "...", "code": "ERROR_CODE"}`. (4) Frontend can distinguish error types programmatically. |

### T-009: Clean Up Redundant Frontend Trees

| Field | Value |
|---|---|
| **Source** | GAP-09 |
| **Description** | `bijee_frontend/` contains stale/duplicate HTML/CSS/JS files. Audit for unique functionality, migrate any missing features to `frontend/`, then remove `bijee_frontend/`. |
| **Files** | `bijee_frontend/` |
| **Priority** | P2 - Medium |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) All unique functionality from `bijee_frontend/` preserved in `frontend/`. (2) `bijee_frontend/` removed after migration. (3) No regression in frontend functionality. |

### T-010: Implement Real-Time Messaging

| Field | Value |
|---|---|
| **Source** | GAP-10 |
| **Description** | Messaging is currently poll-based. Implement WebSocket/SSE with Redis pub/sub for real-time message delivery. |
| **Files** | `backend/app/routers/messages.py`, `backend/app/services/`, `frontend/src/pages/Messages.js` |
| **Priority** | P3 - Low |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) WebSocket endpoint established. (2) Messages delivered in real-time without polling. (3) Redis pub/sub integration. (4) Existing REST endpoints still work. |

### T-011: Implement Notifications System

| Field | Value |
|---|---|
| **Source** | GAP-11 |
| **Description** | No notification system exists. Add `Notification` model, backend triggers for key events (dispute, contract signed, payment released), frontend bell icon with unread count and dropdown. |
| **Files** | `backend/app/models/`, `backend/app/routers/`, `frontend/src/components/` |
| **Priority** | P3 - Low |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) `Notification` model exists. (2) Backend triggers on: dispute raised/resolved, contract signed, milestone approved. (3) Frontend bell icon with badge. (4) Click to view notification dropdown. |

### T-012: Fix Private Key Single Point of Failure

| Field | Value |
|---|---|
| **Source** | GAP-12, NFR-14 |
| **Description** | Single `CLIENT_PRIVATE_KEY` used for all on-chain operations. Document as known limitation for development, implement basic multi-key support (per-user or per-contract), and add production readiness note for external signer integration. |
| **Files** | `backend/app/config.py:17`, `backend/app/services/blockchain_service.py`, `docs/` |
| **Priority** | P1 - High |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Risk documented prominently. (2) Multi-key support or documented production path. (3) No regression in blockchain operations. |

### T-013: Align Missing Schema Tables with Models

| Field | Value |
|---|---|
| **Source** | GAP-13 |
| **Description** | `schema.sql` defines `admin_accounts` and `session_audit` tables not in `models.py`. Either add models for these tables or update `schema.sql` to remove them. |
| **Files** | `database/schema.sql:241-269`, `backend/app/models/models.py` |
| **Priority** | P2 - Medium |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) `schema.sql` matches `models.py` exactly. (2) No orphan tables in schema definition. |

### T-014: Fix Deprecated `datetime.utcnow()` Calls

| Field | Value |
|---|---|
| **Source** | GAP-14 |
| **Description** | `contract_service.py` uses deprecated `datetime.utcnow()`. Replace with `datetime.now(timezone.utc)`. |
| **Files** | `backend/app/services/contract_service.py:253`, `contract_service.py:295` |
| **Priority** | P3 - Low |
| **Complexity** | Trivial |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) All `datetime.utcnow()` replaced. (2) No deprecation warnings. (3) Timestamps still accurate. |

### T-015: Fix Admin Messages Tab Not Loading

| Field | Value |
|---|---|
| **Source** | GAP-15 |
| **Description** | AdminPanel messages tab shows empty because `loadEntities` never triggers for messages tab. Add separate load call for messages. |
| **Files** | `frontend/src/pages/AdminPanel.js:71-73` |
| **Priority** | P2 - Medium |
| **Complexity** | Trivial |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Admin messages tab loads data on initial mount. (2) No console errors. (3) Other admin tabs unaffected. |

### T-016: Add Timeouts for Blockchain Calls

| Field | Value |
|---|---|
| **Source** | NFR-08 |
| **Description** | No explicit timeout for Web3/blockchain calls. Add timeout configuration for blockchain RPC calls and consider response time monitoring middleware. |
| **Files** | `backend/app/services/blockchain_service.py` |
| **Priority** | P2 - Medium |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Web3 calls have explicit timeouts. (2) Timeout errors handled gracefully. (3) Configurable via settings. |

### T-017: Add `.env.example` Documentation

| Field | Value |
|---|---|
| **Source** | Sprint Plan, Documentation |
| **Description** | Ensure `.env.example` files are complete and documented. Add missing variables (JWT_SECRET, ENCRYPTION_KEY, CONTRACT_OWNER_KEY) with descriptions. |
| **Files** | `backend/.env.example`, `frontend/.env.example`, `README.md` |
| **Priority** | P3 - Low |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) All env vars documented in examples. (2) Defaults are safe for development. |

### T-018: Update Sprint Plan Documentation

| Field | Value |
|---|---|
| **Source** | CAPSTONE_REVIEW.md, Audit Findings |
| **Description** | Sprint plans contain inaccurate completion claims (Alembic, testing, wallet privacy). Update to reflect actual status accurately. |
| **Files** | `docs/plans/sprint-plans.md` |
| **Priority** | P1 - High |
| **Complexity** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | (1) Sprint plan accurately reflects actual implementation status. (2) False completion claims corrected. (3) Remaining work properly tracked. |

---

## Task Dependencies Graph

```
T-001 (Wallet Privacy)        ───── isolated
T-002 (Migrations)            ───── isolated
T-003 (Schema Enums)          ───── isolated
T-004 (Frontend Tests)        ──── depends on: T-009 (clean up first)
T-005 (Backend Tests)         ──── depends on: T-016 (timeouts first)
T-006 (Frontend Docker)       ───── isolated
T-007 (Job Search)            ───── isolated
T-008 (Error Codes)           ───── isolated
T-009 (Cleanup Frontend)      ───── isolated
T-010 (Real-time Messaging)   ───── isolated (stretch)
T-011 (Notifications)         ───── isolated (stretch)
T-012 (Private Key)           ───── isolated
T-013 (Schema Alignment)      ───── isolated
T-014 (utcnow Fix)            ───── isolated
T-015 (Admin Messages)        ───── isolated
T-016 (Blockchain Timeouts)   ───── isolated
T-017 (Env Docs)              ───── isolated
T-018 (Sprint Plan Docs)      ───── depends on: T-001, T-002, T-003 (fix docs after code)
```
