# Master Backlog — FreeLedger

> All outstanding work mapped to requirements
> Sources: `.wip/backlog/tasks.md` (previous), `docs/superpowers/specs/*`, `docs/plans/sprint-plans.md`, `P*_test.txt`
> Date: June 16, 2026

---

## Summary

| Priority | Count | Total Effort |
|---|---|---|
| P0 - Critical | 1 | 1-2 days |
| P1 - High | 7 | ~6.5 days |
| P2 - Medium | 11 | ~4 days |
| P3 - Low | 10 | ~9 days |
| **Total** | **29** | **~20-22 days** |

> Note: P3 includes 2 stretch features (real-time messaging + notifications) at 4 days combined.

---

## P0 — Critical

### MB-001: Fix Wallet Address Privacy (GAP-01, NFR-11, SEC-05, CAP-01)

| Field | Value |
|---|---|
| **Description** | Wallet address stored in `users.wallet_address` despite `data-flow.md` claiming it's never stored. Fix: either hash addresses or update docs. |
| **Requirement Links** | NFR-11, SEC-05, CAP-01 |
| **Source** | GAP-01, C-01 |
| **Dependencies** | None |
| **Effort** | 1-2 days |
| **Acceptance Criteria** | (1) No plaintext wallet addresses in DB, OR docs accurately describe storage. (2) MetaMask login still works. (3) All tests pass. |

---

## P1 — High

### MB-002: Fix Database Migration Strategy (GAP-02, NFR-13, CAP-01)

| Field | Value |
|---|---|
| **Description** | Sprint claim (Alembic ✅) contradicts code (`create_all()`). Fix: implement Alembic or update docs. |
| **Requirement Links** | NFR-13, CAP-01 |
| **Source** | GAP-02, C-02 |
| **Dependencies** | None |
| **Effort** | 4 hours |
| **Acceptance Criteria** | (1) `create_all()` replaced or documented. (2) If Alembic: migrations run on startup. (3) All tables created. |

### MB-003: Fix Schema Enum Mismatch (GAP-03, CAP-01)

| Field | Value |
|---|---|
| **Description** | `database/schema.sql` enum values differ from Python `models.py` enum classes. Sync SQL to match Python. |
| **Requirement Links** | CAP-01 |
| **Source** | GAP-03, C-03 |
| **Dependencies** | None |
| **Effort** | 1 hour |
| **Acceptance Criteria** | (1) All enum values in `schema.sql` exactly match `models.py`. |

### MB-004: Add Frontend Component Tests (GAP-04, NFR-15, TEST-10, CAP-02)

| Field | Value |
|---|---|
| **Description** | Zero frontend tests. Add Jest + React Testing Library. Test ProposalForm, Dashboards, ContractDetailPage. |
| **Requirement Links** | NFR-15, TEST-10, CAP-02 |
| **Source** | GAP-04 |
| **Dependencies** | MB-012 (clean up redundant frontend first) |
| **Effort** | 1.5 days |
| **Acceptance Criteria** | (1) Jest + RTL configured. (2) ≥5 component tests. (3) `npm test` passes. |

### MB-005: Add Missing Backend Service Tests (GAP-05, NFR-16, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, CAP-02)

| Field | Value |
|---|---|
| **Description** | Missing tests for contract service, messaging, proposals, admin endpoints, auth edge cases. |
| **Requirement Links** | NFR-16, TEST-05/06/07/08/09, CAP-02 |
| **Source** | GAP-05 |
| **Dependencies** | MB-016 (add blockchain timeouts first for reliable tests) |
| **Effort** | 3 days |
| **Acceptance Criteria** | (1) Contract service tests. (2) Messaging tests. (3) Proposal tests. (4) Admin CRUD tests. (5) Auth edge case tests. (6) All pass. |

### MB-006: Fix Private Key Single Point of Failure (GAP-12, NFR-14, SEC-06)

| Field | Value |
|---|---|
| **Description** | Single key for all on-chain operations. Document risk, implement multi-key support, add production readiness guide. |
| **Requirement Links** | NFR-14, SEC-06 |
| **Source** | GAP-12 |
| **Dependencies** | None |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) Risk documented. (2) Multi-key or external signer path defined. (3) No regression. |

### MB-007: Update Sprint Plan Documentation (CAP-01)

| Field | Value |
|---|---|
| **Description** | Sprint plans contain inaccurate completion claims. Correct to reflect actual status. |
| **Requirement Links** | CAP-01 |
| **Source** | C-02, C-03, C-05, C-06, REQUIREMENTS_AUDIT.md |
| **Dependencies** | MB-001, MB-002, MB-003 (fix docs after code changes) |
| **Effort** | 2 hours |
| **Acceptance Criteria** | (1) Sprint plan accurately reflects reality. (2) False claims corrected. |

### MB-008: Align Schema Tables with Models (GAP-13)

| Field | Value |
|---|---|
| **Description** | `schema.sql` defines `admin_accounts` and `session_audit` tables not in `models.py`. Align both directions. |
| **Requirement Links** | CAP-01 |
| **Source** | GAP-13 |
| **Dependencies** | MB-003 (do while fixing enums) |
| **Effort** | 2 hours |
| **Acceptance Criteria** | (1) No orphan tables in schema or model. (2) Matches exactly. |

---

## P2 — Medium

### MB-009: Create Frontend Dockerfile (GAP-06, CAP-03)

| Field | Value |
|---|---|
| **Description** | No frontend Docker image. Create Dockerfile with Nginx serving production build. Add to docker-compose. |
| **Requirement Links** | CAP-03 |
| **Source** | GAP-06 |
| **Dependencies** | None |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) `frontend/Dockerfile` exists. (2) Frontend service in compose. (3) `docker compose up` serves frontend. |

### MB-010: Add Server-Side Job Search (GAP-07, FR-05)

| Field | Value |
|---|---|
| **Description** | Job list lacks `?search=` param. Add ILIKE search on title/description. Update frontend. |
| **Requirement Links** | FR-05 |
| **Source** | GAP-07 |
| **Dependencies** | None |
| **Effort** | 2 hours |
| **Acceptance Criteria** | (1) `GET /jobs?search=term` works. (2) Case-insensitive. (3) Frontend uses API param. |

### MB-011: Add Error Codes to API Responses (GAP-08, NFR-09, C-07)

| Field | Value |
|---|---|
| **Description** | Add `code` field to all error responses. Define error code constants. |
| **Requirement Links** | NFR-09, CAP-01 |
| **Source** | GAP-08, C-07 |
| **Dependencies** | None |
| **Effort** | 3 hours |
| **Acceptance Criteria** | (1) Error codes defined. (2) All responses include `code`. (3) Frontend can distinguish error types. |

### MB-012: Clean Up Redundant Frontend Trees (GAP-09)

| Field | Value |
|---|---|
| **Description** | `bijee_frontend/` contains stale/duplicate HTML/CSS/JS. Audit, migrate unique functionality, remove. |
| **Requirement Links** | Code quality |
| **Source** | GAP-09, C-04 |
| **Dependencies** | None |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) All unique functionality preserved in `frontend/`. (2) `bijee_frontend/` removed. (3) No regression. |

### MB-013: Fix Admin Messages Tab Not Loading (GAP-15, UI-04)

| Field | Value |
|---|---|
| **Description** | Admin messages tab empty on mount. Add separate load call for messages. |
| **Requirement Links** | UI-04 |
| **Source** | GAP-15 |
| **Dependencies** | None |
| **Effort** | 30 min |
| **Acceptance Criteria** | (1) Admin messages tab loads on mount. (2) No console errors. |

### MB-014: Add Timeouts for Blockchain Calls (NFR-08)

| Field | Value |
|---|---|
| **Description** | Web3 calls lack explicit timeouts. Add timeout configuration. |
| **Requirement Links** | NFR-08 |
| **Source** | REQUIREMENTS_AUDIT.md NFR-08 |
| **Dependencies** | None |
| **Effort** | 4 hours |
| **Acceptance Criteria** | (1) Web3 calls have timeouts. (2) Configurable via settings. (3) Timeout errors handled. |

### MB-015: Implement Freelancer Directory Backend (FR-20, UI-06)

| Field | Value |
|---|---|
| **Description** | New `GET /users/` with filters (role, search, skills, experience_level, is_available, min_rate, max_rate). |
| **Requirement Links** | FR-19, FR-20 |
| **Source** | `freelancer-discovery-design.md` |
| **Dependencies** | MB-017 (user model additions first) |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) All query filters work. (2) Paginated response. (3) Tests pass. |

### MB-016: Implement Freelancer Directory Frontend (FR-21, FR-22, UI-06)

| Field | Value |
|---|---|
| **Description** | `FreelancerDirectory.js` with search, filters, cards, invite button. `/freelancers` route. |
| **Requirement Links** | FR-21, FR-22, UI-06 |
| **Source** | `freelancer-discovery-design.md` |
| **Dependencies** | MB-015 (backend first) |
| **Effort** | 1.5 days |
| **Acceptance Criteria** | (1) Page renders with search/filter. (2) Invite button opens modal. (3) Route guarded by `ClientRoute`. |

### MB-017: Add User Model Fields for Freelancer Discovery (FR-19)

| Field | Value |
|---|---|
| **Description** | Add `headline`, `experience_level`, `industries`, `is_available`, `portfolio_cids` to User model + schemas. |
| **Requirement Links** | FR-19 |
| **Source** | `freelancer-discovery-design.md` |
| **Dependencies** | MB-002 or MB-003 (schema alignment first) |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) New fields in User model. (2) Pydantic schemas updated. (3) Migration handled. |

### MB-018: Add People You May Know Endpoint (FR-23)

| Field | Value |
|---|---|
| **Description** | `GET /recommendations/people` matching by overlapping skills. |
| **Requirement Links** | FR-23 |
| **Source** | `freelancer-discovery-design.md` Phase 6 |
| **Dependencies** | MB-015 (uses same /users/ infrastructure) |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) Endpoint returns skill-matched users. (2) Tests pass. |

### MB-019: Implement Proposal-to-Message Auto-Thread (UI-08)

| Field | Value |
|---|---|
| **Description** | Auto-create message thread with system message on proposal submission. |
| **Requirement Links** | UI-08 |
| **Source** | `freelancer-discovery-design.md` Phase 6 |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) On proposal submit, message thread created. (2) System message reads "[Name] submitted proposal for [Job] — Bid: X ETH". |

### MB-020: Enhanced Chat UI (UI-07) ✅

| Field | Value |
|---|---|
| **Description** | Search filters conversations by username, headline, message content; relative timestamps ("2 minutes ago", "1 hour ago", "Yesterday"); unread indicator improvements (bold highlight, dot badge). |
| **Requirement Links** | UI-07 |
| **Source** | `freelancer-discovery-design.md` Phase 6 |
| **Dependencies** | None |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) Search filters conversations by name, headline, and message content. (2) Timestamps shown as relative text. (3) Unread indicators clear with bold highlight and dot badge. (4) Auto-scroll works smoothly. |

---

## P3 — Low

### MB-021: Fix Deprecated `datetime.utcnow()` (GAP-14)

| Field | Value |
|---|---|
| **Description** | `contract_service.py` uses deprecated `utcnow()`. Replace with `datetime.now(timezone.utc)`. |
| **Requirement Links** | Code quality |
| **Source** | GAP-14 |
| **Dependencies** | None |
| **Effort** | 30 min |
| **Acceptance Criteria** | (1) All `utcnow()` replaced. (2) No deprecation warnings. |

### MB-022: Add `.env.example` Documentation

| Field | Value |
|---|---|
| **Description** | Complete `.env.example` files with all variables documented. |
| **Requirement Links** | Developer experience |
| **Source** | Sprint plan |
| **Dependencies** | None |
| **Effort** | 1 hour |
| **Acceptance Criteria** | (1) All env vars in examples. (2) Safe dev defaults. |

### MB-023: Real-Time Messaging via WebSocket/SSE (GAP-10)

| Field | Value |
|---|---|
| **Description** | Redis pub/sub backend, WebSocket event emitter, auto-refresh. |
| **Requirement Links** | FR-14 (enhancement) |
| **Source** | GAP-10, Sprint 5E |
| **Dependencies** | MB-005 (messaging tests first) |
| **Effort** | 2 days |
| **Acceptance Criteria** | (1) Real-time delivery. (2) No polling. (3) Existing REST works. |

### MB-024: Notifications System (GAP-11, UI-09)

| Field | Value |
|---|---|
| **Description** | `Notification` model, backend triggers, bell icon with dropdown. |
| **Requirement Links** | UI-09 |
| **Source** | GAP-11 |
| **Dependencies** | MB-023 (reuses WebSocket infrastructure) |
| **Effort** | 2 days |
| **Acceptance Criteria** | (1) Notifications table exists. (2) Triggers on key events. (3) Bell icon with badge. |

### MB-025: API Response Time Monitoring (TEST-13)

| Field | Value |
|---|---|
| **Description** | Request timing middleware, log slow endpoints. |
| **Requirement Links** | NFR-08 (partial), TEST-13 |
| **Source** | Sprint 5D |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) Middleware measures response times. (2) Slow endpoint logging. |

### MB-026: IPFS Availability Monitoring (TEST-14)

| Field | Value |
|---|---|
| **Description** | Health check script for IPFS node connectivity. |
| **Requirement Links** | NFR-10 (health check expansion), TEST-14 |
| **Source** | Sprint 5D |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) IPFS health check existing (P2.5). Monitoring alert script. |

### MB-027: Event Listener Health Monitoring (TEST-15)

| Field | Value |
|---|---|
| **Description** | Heartbeat metric, alert on missed polls. |
| **Requirement Links** | TEST-15 |
| **Source** | Sprint 5D |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) Event listener heartbeat metric. (2) Alert on missed polls. |

### MB-028: Smart Contract Edge Case Tests (TEST-11)

| Field | Value |
|---|---|
| **Description** | Reentrancy, overflow, unauthorized access tests for GigEscrow.sol. |
| **Requirement Links** | TEST-11 |
| **Source** | Sprint 5A |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) Edge case tests pass. (2) Coverage improved. |

### MB-029: JWT Secret Rotation Support

| Field | Value |
|---|---|
| **Description** | Support multiple valid secrets during rotation window. |
| **Requirement Links** | SEC-01 (enhancement) |
| **Source** | Sprint 5B |
| **Dependencies** | None |
| **Effort** | 0.5 day |
| **Acceptance Criteria** | (1) Multiple secrets supported. (2) Graceful rotation. |

### MB-030: Deployment Guide

| Field | Value |
|---|---|
| **Description** | Step-by-step production deployment guide. |
| **Requirement Links** | CAP-03 |
| **Source** | Sprint 5C |
| **Dependencies** | MB-009 (frontend Docker) |
| **Effort** | 1 day |
| **Acceptance Criteria** | (1) Deployment guide written. (2) Covers all environments. |

---

## Dependency Graph

```
MB-001 (Wallet Privacy) ──── isolated
MB-002 (Migrations) ──────── isolated
MB-003 (Schema Enums) ────── → MB-008 (Schema Tables)
MB-004 (Frontend Tests) ──── → depends on MB-012 (cleanup)
MB-005 (Backend Tests) ───── → depends on MB-014 (timeouts)
MB-006 (Private Key) ─────── isolated
MB-007 (Sprint Docs) ─────── → depends on MB-001, MB-002, MB-003
MB-008 (Schema Tables) ───── → depends on MB-003
MB-009 (Frontend Docker) ─── isolated
MB-010 (Job Search) ──────── isolated
MB-011 (Error Codes) ─────── isolated
MB-012 (Cleanup Frontend) ── isolated
MB-013 (Admin Messages) ──── isolated
MB-014 (Blockchain Timeouts) ──── isolated
MB-015 (Freelancer Backend) ───→ depends on MB-017 (model fields)
MB-016 (Freelancer Frontend) ──→ depends on MB-015
MB-017 (User Model Fields) ───→ depends on MB-003 or MB-002
MB-018 (People You May Know) ─→ depends on MB-015
MB-019 (Proposal→Message) ──── isolated
MB-020 (Enhanced Chat UI) ──── isolated
MB-021 (utcnow fix) ────────── isolated
MB-022 (Env Docs) ──────────── isolated
MB-023 (Real-time Messaging) ─→ depends on MB-005 (messaging tests)
MB-024 (Notifications) ───────→ depends on MB-023
MB-025 (API Monitoring) ────── isolated
MB-026 (IPFS Monitoring) ───── isolated
MB-027 (Event Listener Health) ─ isolated
MB-028 (Contract Edge Tests) ── isolated
MB-029 (JWT Rotation) ──────── isolated
MB-030 (Deployment Guide) ────→ depends on MB-009
```
