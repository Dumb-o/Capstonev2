# FreeLedger — Gap Analysis

## Methodology

This document identifies all inconsistencies between documented requirements, progress reports, architecture, and the actual implementation. Every claim is verified against the codebase.

---

## Critical Gaps

### GAP-01: Wallet Address Stored in Database (Documentation Contradiction)

| Field | Value |
|---|---|
| **Description** | `docs/architecture/data-flow.md` stated "Wallet address is NEVER stored in the database." However, `backend/app/models/models.py:90` stores `wallet_address` as a persistent column. |
| **Evidence** | Doc `data-flow.md` (previous version) vs Code: `models.py:90` `wallet_address = Column(String(42), unique=True, nullable=True, index=True)`. The wallet address is queried in `auth.py:43,67` for login. |
| **Severity** | **RESOLVED** |
| **Resolution** | **Option B — Documentation corrected.** Wallet addresses are architecturally required in plaintext for: (1) MetaMask login lookup by address, (2) Retrieving freelancer addresses for on-chain contract creation (`contract_service.py:83`), (3) Spending uniqueness enforcement. Hashing would break these critical flows without a replacement design. Documentation updated to accurately describe the actual architecture. |
| **Fix Applied** | `docs/architecture/data-flow.md` — Privacy Architecture section rewritten. `docs/plans/sprint-plans.md` — principle corrected. Gap analysis, review, and audit docs updated for consistency. |

### GAP-02: Alembic Migrations vs `create_all()`

| Field | Value |
|---|---|
| **Description** | Sprint plan claims "Alembic migrations (not `create_all()`)" but the actual code uses `Base.metadata.create_all()` on startup. |
| **Evidence** | Sprint: `sprint-plans.md` "Alembic migrations (not `create_all()`) — ✅ Done". Code: `database.py:15-16` `init_db()` uses `conn.run_sync(Base.metadata.create_all)`. Alembic files exist (`alembic/versions/001_initial_schema.py`, `alembic/versions/9a7d3d8656b4_add_email_auth.py`) but are never referenced or executed. |
| **Severity** | **HIGH** |
| **Impact** | (1) Production schema migrations are dangerous and untracked. (2) Sprint claim is factually incorrect. (3) `create_all()` does not handle schema evolution gracefully. |
| **Suggested Fix** | Either (a) remove Alembic and update documentation to say "auto-create", or (b) properly implement Alembic: remove `create_all()`, run `alembic upgrade head` on startup, add migration for any missing tables. |
| **Effort** | Small (4 hours) — configure Alembic to run migration on startup and verify all tables exist. |

### GAP-03: Schema Enum Mismatch (schema.sql vs models.py)

| Field | Value |
|---|---|
| **Description** | The SQL schema file defines different enum values than the SQLAlchemy model enums. Since `create_all()` is used, the Python enums win, but the SQL schema is misleading. |
| **Evidence** | `schema.sql:14-22` contract_status: `draft, pending, signed, active, completed, disputed, cancelled`. `models.py:41-51` ContractStatus: `draft, pending_review, pending_signatures, pending_funding, active, delivered, revision_requested, completed, cancelled, disputed`. Similarly for milestone_status, dispute_status, and dispute_decision. |
| **Severity** | **HIGH** |
| **Impact** | (1) Schema documentation is misleading. (2) If someone runs `schema.sql` directly, they get incompatible enums. (3) Academic inconsistency. |
| **Suggested Fix** | Update `schema.sql` to match the Python models exactly. |
| **Effort** | Small (1 hour) — copy enum values from Python models into SQL schema. |

### GAP-04: Frontend Testing Absent

| Field | Value |
|---|---|
| **Description** | Sprint 5A plans frontend component tests for ProposalForm, Dashboards, ContractDetailPage. Zero frontend tests exist. |
| **Evidence** | `tests/frontend/` contains only `__init__.py`. No test framework configured in `frontend/package.json` (no Jest, no React Testing Library in dependencies). |
| **Severity** | **HIGH** |
| **Impact** | (1) No frontend quality assurance. (2) Academic deliverables claim testing that was not done. (3) Regression risk for UI changes. |
| **Suggested Fix** | Add Jest + React Testing Library, implement component tests for 3 critical components: ProposalForm, both Dashboards, ContractDetailPage. |
| **Effort** | Medium (1.5 days) — setup + 5-8 component tests. |

### GAP-05: Missing Backend Tests (Contracts, Messaging, Proposals, Admin)

| Field | Value |
|---|---|
| **Description** | Sprint 5A plans extensive backend tests. Only auth (4 tests), IPFS (2 tests), blockchain (7 tests), and integration (2 tests) exist. |
| **Evidence** | Sprint plan tasks for: contracts service unit tests, disputes & admin tests, messaging tests, proposals tests, auth edge cases. Files: `tests/backend/test_auth.py` (4 tests), `test_ipfs.py` (2 tests), `test_p01_async_blockchain.py` (7 tests), `test_integration.py` (2 tests). |
| **Severity** | **HIGH** |
| **Impact** | (1) Gaps in critical business logic testing (contract service, messaging). (2) Academic deliverables incomplete. |
| **Suggested Fix** | Add tests for: contract_service (create, sign, fund, milestone flows), messaging (send, conversations), proposals (submit, accept/reject), admin (stats, CRUD), auth edge cases (expired tokens, invalid signatures, duplicate wallets). |
| **Effort** | Medium (3 days per sprint plan estimate). |

### GAP-06: No Frontend Docker Image

| Field | Value |
|---|---|
| **Description** | Docker compose has backend service but no frontend service. The README says to run `npm start` for frontend separately. |
| **Evidence** | `docker/docker-compose.yml` has services for postgres, redis, ipfs, hardhat, backend — but no frontend service. No `frontend/Dockerfile` exists. |
| **Severity** | **MEDIUM** |
| **Impact** | (1) Incomplete containerization. (2) Manual steps required for frontend deployment. (3) Sprint 5C claims Dockerization of frontend as planned work. |
| **Suggested Fix** | Create `frontend/Dockerfile` with Nginx serving the build, add frontend service to `docker-compose.yml`. |
| **Effort** | Medium (1 day). |

### GAP-07: Server-Side Job Search Missing

| Field | Value |
|---|---|
| **Description** | Sprint plan notes T3: "ExploreJobs search is client-side only" and plans a `?q=` query param. Not implemented. |
| **Evidence** | `backend/app/routers/jobs.py:39-76` — list_jobs() accepts category, skill, min_budget, max_budget, status but no `q` or search text param. Sprint: T3 "ExploreJobs search is client-side only — Medium — Add `?q=` query param to API". |
| **Severity** | **MEDIUM** |
| **Impact** | (1) Search doesn't work at scale (client filters all jobs). (2) Known issue not resolved. |
| **Suggested Fix** | Add `search` query parameter to `GET /jobs` that searches title and description with `ilike`. |
| **Effort** | Small (2 hours). |

### GAP-08: Error Response Format Mismatch

| Field | Value |
|---|---|
| **Description** | API spec promises `{ "detail": "message", "code": "ERROR_CODE" }` but only `detail` is returned. |
| **Evidence** | `docs/architecture/api-spec.md:5` — `{ "detail": "message", "code": "ERROR_CODE" }`. Actual responses: `{"detail": "Contract not found"}` — no `code` field. Custom exceptions in `exceptions.py` don't include codes. |
| **Severity** | **MEDIUM** |
| **Impact** | API consumers can't programmatically identify error types without parsing messages. |
| **Suggested Fix** | Add error code constants and include them in all exception responses. |
| **Effort** | Small (3 hours). |

### GAP-09: Redundant Frontend Trees (RESOLVED)

| Field | Value |
|---|---|
| **Description** | Two parallel frontend codebases: `frontend/` (main) and `bijee_frontend/` (legacy/alternate). Sprint T6 notes this as causing confusion. |
| **Evidence** | `bijee_frontend/` contained `client/`, `freelancer/`, `freeledger/` subdirectories with separate component trees. |
| **Severity** | ~~MEDIUM~~ RESOLVED |
| **Impact** | Resolved in Queue-15: `bijee_frontend/` audited, classified as SAFE TO DELETE (all features were localStorage demo data with no real API integration), removed. |
| **Suggested Fix** | ✅ Complete — `bijee_frontend/` removed. No migration needed (no unique production functionality found). |
| **Effort** | Completed (Queue-15, ~2 hours). |

### GAP-10: WebSocket/Real-Time Messaging Not Implemented

| Field | Value |
|---|---|
| **Description** | Sprint 5E plans real-time messaging via WebSocket/SSE using Redis pub/sub. Not implemented. |
| **Evidence** | Sprint: "Real-time messaging via WebSocket/SSE — Anushree/Bijee — Redis pub/sub backend, WebSocket event emitter, auto-refresh — 2 days". Messaging is currently poll-based (axios calls). |
| **Severity** | **LOW** |
| **Impact** | Users must refresh to see new messages. Not a blocker for MVP but reduces UX quality. |
| **Suggested Fix** | Implement WebSocket endpoint with Redis pub/sub as planned in Sprint 5E. |
| **Effort** | Medium (2 days). |

### GAP-11: Notifications System Absent

| Field | Value |
|---|---|
| **Description** | Sprint 5E plans a notifications table + bell icon + dropdown. Not implemented. |
| **Evidence** | Sprint: "Notifications system (model + UI) — Runa/Bijee — notifications table, bell icon badge, dropdown list — 2 days". No `Notification` model or table exists. |
| **Severity** | **LOW** |
| **Impact** | Users don't get notified of events (disputes, contract signed, payment released). Reduced UX. |
| **Suggested Fix** | Implement `notifications` table, backend triggers, frontend bell icon with unread count. |
| **Effort** | Medium (2 days). |

### GAP-12: Private Key Single Point of Failure

| Field | Value |
|---|---|
| **Description** | All blockchain transactions use a single `CLIENT_PRIVATE_KEY` env var. If compromised, all contract funds are at risk. |
| **Evidence** | `backend/app/config.py:18` — `client_private_key: str`. Used throughout `blockchain_service.py` for all on-chain operations. |
| **Severity** | **HIGH** |
| **Impact** | Security vulnerability — a single key controls all escrow contracts. |
| **Remediation** | ✅ **Risk documented** — see `docs/architecture/security.md` for full risk assessment, code-level comments in `blockchain_service.py` (signing authority block), startup warnings in `main.py` lifespan, and future architecture path (Options A–D). Architectural limitation is acceptable for local development. Production deployments must implement external signer or per-user signing before handling real funds. |
| **Status** | **✅ Documented and Mitigated** |

### GAP-13: `admin_accounts` and `session_audit` Tables Not in Models

| Field | Value |
|---|---|
| **Description** | `schema.sql` defines `admin_accounts` and `session_audit` tables that don't exist in `models.py`. |
| **Evidence** | `schema.sql:241-269` — CREATE TABLE admin_accounts, CREATE TABLE session_audit. `models.py` — no AdminAccount table (AdminAccount at line 225 is different — it has `user_id` FK), no SessionAudit model. |
| **Severity** | **MEDIUM** |
| **Impact** | (1) Schema drift between SQL and Python models. (2) Session audit logging not implemented. |
| **Suggested Fix** | Align models with schema or update schema to match models. |
| **Effort** | Small (2 hours). |

### GAP-14: Contract Service Uses `datetime.utcnow()` (Deprecated)

| Field | Value |
|---|---|
| **Description** | `contract_service.py` uses deprecated `datetime.utcnow()` instead of timezone-aware `datetime.now(timezone.utc)`. |
| **Evidence** | `contract_service.py:253` — `milestone.submitted_at = datetime.utcnow()`, `contract_service.py:295` — `milestone.approved_at = datetime.utcnow()` |
| **Severity** | **LOW** |
| **Impact** | Deprecated in Python 3.12, will be removed in future versions. Naive datetime comparison issues. |
| **Suggested Fix** | Replace `datetime.utcnow()` with `datetime.now(timezone.utc)`. |
| **Effort** | Trivial (30 minutes). |

### GAP-15: Missing `admin/messages` Tab Data Loading

| Field | Value |
|---|---|
| **Description** | The AdminPanel messages tab shows empty because `loadEntities` never triggers for messages tab. |
| **Evidence** | `AdminPanel.js:71-73` — effect only calls `loadEntities` when tab !== 'dashboard'. The messages tab has no initial data load on mount. The stats fetch at line 52 does NOT load messages. |
| **Severity** | **MEDIUM** |
| **Impact** | Admin messages tab is empty by default; users must paginate to trigger load. |
| **Suggested Fix** | Add separate load call for messages in the loadAll function or in a dedicated effect. |
| **Effort** | Trivial (30 minutes). |

---

## Summary

| ID | Gap | Severity | Type | Effort |
|---|---|---|---|---|
| GAP-01 | Wallet address stored despite privacy claim | CRITICAL | Doc↔Code Contradiction | 1-2 days |
| GAP-02 | `create_all()` instead of Alembic migrations | HIGH | Doc↔Code Contradiction | 4 hours |
| GAP-03 | Schema enum mismatch (SQL vs Python) | HIGH | Doc↔Code Contradiction | 1 hour |
| GAP-04 | No frontend tests | HIGH | Missing Implementation | 1.5 days |
| GAP-05 | Missing backend tests | HIGH | Missing Implementation | 3 days |
| GAP-06 | No frontend Docker image | MEDIUM | Missing Implementation | 1 day |
| GAP-07 | No server-side job search | MEDIUM | Missing Implementation | 2 hours |
| GAP-08 | Error response format mismatch | MEDIUM | Doc↔Code Contradiction | 3 hours |
| GAP-09 | Redundant frontend trees | MEDIUM | Technical Debt | 1 day |
| GAP-10 | No real-time messaging | LOW | Missing Feature | 2 days |
| GAP-11 | No notifications system | LOW | Missing Feature | 2 days |
| GAP-12 | Private key single point of failure | HIGH | Security Risk | 1 day |
| GAP-13 | Schema/model mismatch for admin/session tables | MEDIUM | Doc↔Code Contradiction | 2 hours |
| GAP-14 | Deprecated `datetime.utcnow()` | LOW | Technical Debt | 30 min |
| GAP-15 | Admin messages tab not loading | MEDIUM | Bug | 30 min |

**Total Estimated Effort to Close All Gaps**: ~14-17 days
