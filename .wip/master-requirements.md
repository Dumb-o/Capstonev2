# Master Requirements — FreeLedger

> Single source of truth, reconciled from all planning artifacts
> Sources: `docs/plans/sprint-plans.md`, `docs/architecture/api-spec.md`, `docs/architecture/data-flow.md`, `docs/superpowers/specs/2026-06-07-freelancer-discovery-design.md`, `docs/generated/REQUIREMENTS_AUDIT.md`, `docs/generated/GAP_ANALYSIS.md`, `docs/generated/CAPSTONE_REVIEW.md`, `.wip/backlog/tasks.md`, `.wip/implementation-plan.md`, `.wip/progress.md`, `.wip/sprint.md`, `P*_test.txt` (x4)
> Date: June 16, 2026

---

## Requirement ID Scheme

| Prefix | Category |
|---|---|
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| UI | UI/UX Requirement |
| SEC | Security Requirement |
| TEST | Testing Requirement |
| CAP | Capstone/Academic Requirement |

---

## Summary

| Category | Total | ✅ Complete | ⚠️ Partial | ❌ Missing | New (from newer docs) |
|---|---|---|---|---|---|
| FR | 25 | 18 | 2 | 0 | 5 (FR-19 through FR-23) |
| NFR | 19 | 12 | 3 | 4 | 0 |
| UI | 9 | 4 | 1 | 4 | 4 (UI-06 through UI-09) |
| SEC | 6 | 3 | 2 | 1 | 0 |
| TEST | 15 | 6 | 3 | 6 | 0 |
| CAP | 3 | 0 | 0 | 3 | 0 |
| **Total** | **77** | **43** | **11** | **18** | **9** |

---

## Functional Requirements

### FR-01: Wallet-based Authentication (MetaMask)

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 1C, `api-spec.md`, `data-flow.md`, `REQUIREMENTS_AUDIT.md` FR-01 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Nonce challenge → ECDSA signature → JWT. Verified in `auth.py:27-78`, `auth_service.py:27-33`. |

### FR-02: Email/Password Authentication

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 1C, `REQUIREMENTS_AUDIT.md` FR-02 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | `auth.py:110-154`, bcrypt password hashing. |

### FR-03: JWT Token Management (Access + Refresh + Blacklist)

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` FR-03 |
| Priority | High |
| Status | ✅ Complete |
| Notes | 30min access + 7d refresh, Redis blacklist, rotation on refresh. |

### FR-04: User Profile Management

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` FR-04 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | `GET/PUT /users/me`, profile editing page. |

### FR-05: Job CRUD with Search/Filter

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 4, `REQUIREMENTS_AUDIT.md` FR-05 |
| Priority | High |
| Status | ⚠️ Partial |
| Notes | CRUD complete. Missing server-side `?search=` query param (GAP-07). |

### FR-06: Proposals (Submit, Accept/Reject)

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 4, `REQUIREMENTS_AUDIT.md` FR-06 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Auto-contract creation on accept. Verified. |

### FR-07: Contract Creation with Milestones

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 2, `REQUIREMENTS_AUDIT.md` FR-07 |
| Priority | High |
| Status | ✅ Complete |
| Notes | IPFS terms storage, on-chain escrow deployment, milestone sum validation. |

### FR-08: Contract Signing (Dual Signature)

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` FR-08 |
| Priority | High |
| Status | ✅ Complete |
| Notes | `client_signed` and `freelancer_signed` boolean columns. |

### FR-09: Contract Funding

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` FR-09 |
| Priority | High |
| Status | ✅ Complete |
| Notes | On-chain deposit, contract state moves to Active. |

### FR-10: Milestone Submission

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 3, `REQUIREMENTS_AUDIT.md` FR-10 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Freelancer submits deliverable CID. |

### FR-11: Milestone Approval/Rejection

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 3, `REQUIREMENTS_AUDIT.md` FR-11 |
| Priority | High |
| Status | ✅ Complete |
| Notes | On-chain payment release on approval, rejection with reason. |

### FR-12: Dispute Management

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 3, `REQUIREMENTS_AUDIT.md` FR-12 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Raise dispute, admin resolve (refund or release). On-chain via `GigEscrow.sol`. |

### FR-13: IPFS File Storage

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 2, `REQUIREMENTS_AUDIT.md` FR-13 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Upload/download/pin. Background repin service. |

### FR-14: Messaging System

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 4, `REQUIREMENTS_AUDIT.md` FR-14 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Conversations, unread counts, poll-based (no WebSocket). |

### FR-15: Admin Panel

| Field | Value |
|---|---|
| Source | `api-spec.md`, `sprint-plans.md` Sprint 4, `REQUIREMENTS_AUDIT.md` FR-15 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | 7-tab admin UI with full CRUD and dispute resolution. Minor bug: messages tab not loading on mount (GAP-15). |

### FR-16: Recommendations Engine

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Future Feature Backlog (originally FR-5), `REQUIREMENTS_AUDIT.md` FR-16 |
| Priority | Low |
| Status | ✅ Complete |
| Notes | Skill-based job/freelancer matching. Implemented in `recommendation_service.py`. Moved from "future" to done. |

### FR-17: Blockchain Event Listener

| Field | Value |
|---|---|
| Source | `data-flow.md`, `sprint-plans.md` Sprint 2/3, `REQUIREMENTS_AUDIT.md` FR-17 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Polls `MilestoneApproved`, `DisputeRaised`, `DisputeResolved`. Updates DB. |

### FR-18: Blockchain-based Escrow with Fee Collection

| Field | Value |
|---|---|
| Source | `data-flow.md`, `GigEscrow.sol`, `REQUIREMENTS_AUDIT.md` FR-18 |
| Priority | High |
| Status | ✅ Complete |
| Notes | 2.5% platform fee, `PLATFORM_FEE_BPS = 250`. |

### FR-19: User Model Additions (Freelancer Discovery)

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Add `headline`, `experience_level`, `industries`, `is_available`, `portfolio_cids` to User model. Not in current `models.py`. |

### FR-20: Freelancer Directory Backend (GET /users/ with Filters)

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Query params: role, search, skills, experience_level, is_available, min_rate, max_rate. Not in current `routers/users.py`. |

### FR-21: FreelancerDirectory Frontend Component

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Search bar, filter row, freelancer cards, invite button → modal → messages. Not in current frontend. |

### FR-22: Freelancer Route and Navigation

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | `/freelancers` route with `ClientRoute` guard. "Browse Freelancers" nav link. |

### FR-23: People You May Know Endpoint

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` Phase 6 |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | `GET /recommendations/people` matching by overlapping skills. |

---

## Non-Functional Requirements

### NFR-01: JWT-based Authentication on All Endpoints

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` NFR-01 |
| Priority | High |
| Status | ✅ Complete |
| Notes | `get_current_user()` dependency on all protected routes. |

### NFR-02: Role-based Authorization

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` NFR-02 |
| Priority | High |
| Status | ✅ Complete |
| Notes | `get_current_admin()` raises 403 for non-admin. `ProtectedRoute`, `ClientRoute`, `AdminRoute` in frontend. |

### NFR-03: Input Validation

| Field | Value |
|---|---|
| Source | `REQUIREMENTS_AUDIT.md` NFR-03 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Pydantic schemas with regex patterns, min/max length. |

### NFR-04: Input Sanitization (XSS Prevention)

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `P2_test.txt`, `REQUIREMENTS_AUDIT.md` NFR-04 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | `SanitizedStr`/`SanitizedOptionalStr` applied to all user text fields. |

### NFR-05: Rate Limiting

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `P1_test.txt`, `REQUIREMENTS_AUDIT.md` NFR-05 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Redis-backed sliding window. Auth 10/min, IPFS 20/min, Admin 30/min, Default 60/min. |

### NFR-06: CORS Hardening

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `P2_test.txt`, `REQUIREMENTS_AUDIT.md` NFR-06 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Restricted to `localhost:3000, 3001, 8000`. Configurable via `CORS_ORIGINS`. |

### NFR-07: Rate Limiting Bypass for OPTIONS

| Field | Value |
|---|---|
| Source | `rate_limit.py`, `REQUIREMENTS_AUDIT.md` NFR-07 |
| Priority | Low |
| Status | ✅ Complete |
| Notes | Early return for CORS preflight. |

### NFR-08: API Response Timeouts

| Field | Value |
|---|---|
| Source | `REQUIREMENTS_AUDIT.md` NFR-08 |
| Priority | Medium |
| Status | ⚠️ Partial |
| Notes | IPFS calls have timeouts (120s upload, 30s pin, 10s exists). Web3/blockchain calls lack explicit timeouts. No response time monitoring middleware. |

### NFR-09: Error Handling Consistency

| Field | Value |
|---|---|
| Source | `api-spec.md`, `REQUIREMENTS_AUDIT.md` NFR-09, GAP-08 |
| Priority | Medium |
| Status | ⚠️ Partial |
| Notes | `detail` field present. `code` field missing in all responses. Only `{"detail": "..."}` returned. |

### NFR-10: Health Check Endpoint

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 0, `P2.5_test.txt`, `REQUIREMENTS_AUDIT.md` NFR-10 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | `/api/health` reports DB, Redis, IPFS, blockchain, event listener. |

### NFR-11: Wallet Address Privacy

| Field | Value |
|---|---|
| Source | `data-flow.md:277-279`, `REQUIREMENTS_AUDIT.md` NFR-11 |
| Priority | High |
| Status | ❌ Not Implemented / Contradicts Documentation |
| Notes | **CRITICAL CONFLICT**: Docs say address never stored; code stores `wallet_address` in DB. See GAP-01. |

### NFR-12: Pseudonymous ID System

| Field | Value |
|---|---|
| Source | `data-flow.md`, `Technology_Stack.txt`, `REQUIREMENTS_AUDIT.md` NFR-12 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | `usr_`, `job_`, `con_` prefixes. SHA-256 based generation. |

### NFR-13: Database Initialization via Alembic Migrations

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 1B, `REQUIREMENTS_AUDIT.md` NFR-13 |
| Priority | Medium |
| Status | ❌ Not Implemented / Contradicts Documentation |
| Notes | Sprint claims "Alembic migrations (not create_all()) ✅ Done". Code uses `Base.metadata.create_all()`. See GAP-02. |

### NFR-14: Private Key Security

| Field | Value |
|---|---|
| Source | `sprint-plans.md` T5, `REQUIREMENTS_AUDIT.md` NFR-14, GAP-12 |
| Priority | High |
| Status | ⚠️ Partial |
| Notes | Single `CLIENT_PRIVATE_KEY` for all operations. Risk documented. Multi-key or external signer not implemented. |

### NFR-15: Frontend Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A, `REQUIREMENTS_AUDIT.md` NFR-15 |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Zero frontend tests. GAP-04. |

### NFR-16: Backend Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A, `REQUIREMENTS_AUDIT.md` NFR-16 |
| Priority | High |
| Status | ⚠️ Partial |
| Notes | 4 auth tests + 2 IPFS tests + 7 blockchain tests + 2 integration tests exist. Missing: contract service, messaging, proposals, admin, auth edge cases. GAP-05. |

### NFR-17: Integration Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A, `REQUIREMENTS_AUDIT.md` NFR-17 |
| Priority | High |
| Status | ⚠️ Partial |
| Notes | 2 integration tests exist (full lifecycle, dispute lifecycle). Additional planned (IPFS → milestone → approve) not implemented. |

### NFR-18: Smart Contract Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 1A, `REQUIREMENTS_AUDIT.md` NFR-18 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Hardhat tests covering all state transitions. |

### NFR-19: Performance / Load Testing

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5D, `REQUIREMENTS_AUDIT.md` NFR-19, `P2_test.txt` |
| Priority | Low |
| Status | ✅ Complete |
| Notes | Locust load test script with 5 user classes. P2.5 tests show 0% 500 errors. |

---

## UI/UX Requirements

### UI-01: Role-based Dashboards

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 2/3/4 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Client dashboard, freelancer dashboard, admin panel. |

### UI-02: Contract Detail View with Milestone Checklist

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 2 |
| Priority | High |
| Status | ✅ Complete |
| Notes | Sign buttons, status timeline, milestone approve/reject. |

### UI-03: MetaMask Wallet Connect Flow

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 1C |
| Priority | High |
| Status | ✅ Complete |
| Notes | Connect, sign, JWT storage, session persistence. |

### UI-04: Admin Panel (7-tab interface)

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 4 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Dashboard, Users, Jobs, Proposals, Contracts, Disputes, Messages. Bug: messages tab empty on mount (GAP-15). |

### UI-05: Messaging UI

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Sprint 4 |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Conversation list, chat view, send form. Poll-based. |

### UI-06: Freelancer Directory Page

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Search bar, filter row, freelancer cards, invite button. |

### UI-07: Enhanced Chat UI

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` Phase 6 |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Search filters, relative timestamps, unread indicator improvements. |

### UI-08: Proposal-to-Message Auto-Thread

| Field | Value |
|---|---|
| Source | `superpowers/specs/2026-06-07-freelancer-discovery-design.md` Phase 6 |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Auto-create message thread with system message on proposal submission. |

### UI-09: Notifications System

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5E, GAP-11 |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Bell icon, unread badge, dropdown list. No `Notification` model exists. |

---

## Security Requirements

### SEC-01: JWT Token Security

| Field | Value |
|---|---|
| Source | `api-spec.md`, `auth_service.py` |
| Priority | High |
| Status | ✅ Complete |
| Notes | Short-lived access (30min), refresh token rotation, blacklisting. |

### SEC-02: Input Sanitization

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `sanitizer.py` |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Strips HTML, blocks `javascript:` URIs, removes event handlers. |

### SEC-03: Rate Limiting

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `rate_limit.py` |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Redis-backed, per-route configurable limits. |

### SEC-04: CORS Hardening

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5B, `main.py` |
| Priority | Medium |
| Status | ✅ Complete |
| Notes | Restricted origins. Configurable for production. |

### SEC-05: Wallet Address Protection

| Field | Value |
|---|---|
| Source | `data-flow.md` Privacy Architecture |
| Priority | High |
| Status | ❌ Not Implemented |
| Notes | Address stored in plaintext PB. Claimed as never stored. See GAP-01, NFR-11. |

### SEC-06: Private Key Management

| Field | Value |
|---|---|
| Source | `sprint-plans.md` T5, GAP-12 |
| Priority | High |
| Status | ⚠️ Partial |
| Notes | Single key for all ops. Risk documented but not mitigated. |

---

## Testing Requirements

### TEST-01: Auth Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | High |
| Status | ⚠️ Partial (4 exist, failing without Redis/DB) |
| Notes | `test_auth.py`: 4 tests (health, challenge, invalid address, login without challenge). 2 pre-existing failures without Redis/DB. |

### TEST-02: IPFS Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | Medium |
| Status | ✅ Complete (2 exist) |
| Notes | `test_ipfs.py`: empty upload, invalid CID. |

### TEST-03: Blockchain Service Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A, `P01_test.txt` |
| Priority | High |
| Status | ✅ Complete (7 exist) |
| Notes | `test_p01_async_blockchain.py`: submit milestone, raise dispute, resolve (refund/release), helpers, integration-adjacent tests. |

### TEST-04: Integration Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A, `P2_test.txt` |
| Priority | High |
| Status | ⚠️ Partial (2 exist, more planned) |
| Notes | `test_integration.py`: full contract lifecycle + dispute lifecycle. Missing: IPFS → milestone → approve flow. |

### TEST-05: Contract Service Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | High |
| Status | ❌ Not Implemented |
| Notes | Create, sign, fund, milestone submit/approve/reject flows. |

### TEST-06: Dispute & Admin Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | High |
| Status | ❌ Not Implemented |
| Notes | Dispute raise, admin resolve, user management CRUD. |

### TEST-07: Messaging Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Conversations, send, read, unread count. |

### TEST-08: Proposal Unit Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Submit, list, accept/reject flows. |

### TEST-09: Auth Edge Case Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | High |
| Status | ❌ Not Implemented |
| Notes | Expired tokens, invalid signatures, duplicate wallets. |

### TEST-10: Frontend Component Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | ProposalForm, Dashboards, ContractDetailPage. |

### TEST-11: Smart Contract Edge Case Tests

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5A |
| Priority | Medium |
| Status | ❌ Not Implemented |
| Notes | Reentrancy, overflow, unauthorized access tests. |

### TEST-12: Load Testing

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5D, `P2_test.txt` |
| Priority | Low |
| Status | ✅ Complete |
| Notes | Locust script with 5 user classes. Verified 0% 500 errors. |

### TEST-13: API Response Time Monitoring

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5D |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Request timing middleware, slow endpoint logging. |

### TEST-14: IPFS Availability Monitoring

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5D |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Health check script for IPFS node connectivity. |

### TEST-15: Event Listener Health Monitoring

| Field | Value |
|---|---|
| Source | `sprint-plans.md` Phase 5D |
| Priority | Low |
| Status | ❌ Not Implemented |
| Notes | Heartbeat metric, alert on missed polls. |

---

## Capstone/Academic Requirements

### CAP-01: Documentation Accuracy

| Field | Value |
|---|---|
| Source | Academic integrity, GAP-01, GAP-02, GAP-03, GAP-08 |
| Priority | High |
| Status | ❌ Unresolved |
| Notes | 4 documentation contradictions identified. Sprint plan has false completion claims. Must correct before submission. |

### CAP-02: Test Coverage Adequacy

| Field | Value |
|---|---|
| Source | Academic requirement, `MLO1` rubric, `sprint-plans.md` Phase 5A |
| Priority | High |
| Status | ❌ Unresolved |
| Notes | Zero frontend tests, missing critical backend tests. MLO1 requires implementation + testing. |

### CAP-03: Deployment Completeness

| Field | Value |
|---|---|
| Source | Academic requirement, `sprint-plans.md` Phase 5C, GAP-06 |
| Priority | Medium |
| Status | ❌ Unresolved |
| Notes | No frontend Dockerfile, frontend not in docker-compose. Manual `npm start` required. |

---

## Conflict Registry

| ID | Source A | Source B | Conflict | Resolution |
|---|---|---|---|---|
| C-01 | `data-flow.md:277-279` "never stored" | `models.py:81` stores `wallet_address` | Privacy architecture claim vs implementation | **Unresolved**. Recommend: document actual design (option b in GAP-01) as minimum viable fix |
| C-02 | `sprint-plans.md` Sprint 1B "Alembic ✅ Done" | `database.py:15-16` uses `create_all()` | Migration strategy claim vs implementation | **Unresolved**. Recommend: implement proper Alembic or update docs (GAP-02) |
| C-03 | `sprint-plans.md` Sprint 1B "schema.sql ✅" | `models.py` enums vs `schema.sql` enums | Enum definitions don't match | **Unresolved**. Recommend: sync `schema.sql` to match `models.py` (GAP-03) |
| C-04 | `sprint-plans.md` T4 (Known Issue) | `ContractDetailPage.js:71-87` has dispute button | Known issue lists "No dispute button" as open | **Resolved**: Dispute button exists in code. T4 is outdated. |
| C-05 | `sprint-plans.md` T7 (CORS allows `*`) | `main.py` has restricted origins via config | Known issue outdated | **Resolved**: CORS hardening completed in P2. T7 is outdated. |
| C-06 | `sprint-plans.md` FR-5 as "Future" | `routers/recommendations.py` exists | Recommendations implemented but sprint plan calls it future | **Resolved**: Feature is done. Sprint plan should be updated. |
| C-07 | `api-spec.md:5` error shape | `exceptions.py` responses | Spec promises `code` field; actual responses omit it | **Unresolved**. Recommend: add error codes (GAP-08) |
| C-08 | `sprint-plans.md` Phase 5E "Real-time messaging" | Current messaging is poll-based | Spec planned but not implemented | **Acknowledged**: GAP-10. Remains stretch goal. |
