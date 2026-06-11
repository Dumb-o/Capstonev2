# FreeLedger — Detailed Implementation Plan

**Date**: June 11, 2026
**Status**: ~90% functional remaining -> Phase 5 (Production Readiness)

---

## Project Completion Estimate

| Phase | Est. Days | Dependencies | Owner(s) |
|---|---|---|---|
| 5A — Testing | 7 | None (can start immediately) | Anushree, Pawan, Bijee, Sarun |
| 5B — UX Polish | 7 | None (parallel with 5A) | Bijee, Anushree, Runa |
| 5C — Security Hardening | 3.5 | None | Pawan, Sarun, Anushree |
| 5D — Infrastructure & DevOps | 3.5 | None | Pawan, Bijee, Runa |
| 5E — Real-Time & Performance | 4.5 | None | Anushree, Bijee, Pawan, Runa |
| **Total remaining** | **~25 days** | | **All** |

---

## Phase 5A: Testing (Days 1-7)

### Task 5A.1: Backend Unit Tests — Contract Service
**Assignee**: Anushree  
**Files**: `tests/backend/test_contracts.py` (new)  
**Est. time**: 2 days

**Test cases**:
- `test_create_contract_offchain` — Create contract without private key, verify off-chain-only mode
- `test_create_contract_onchain` — Create contract with mocked private key, verify on-chain call
- `test_create_contract_milestone_amount_mismatch` — Milestones don't sum to total -> 400
- `test_create_contract_duplicate_proposal` — Same job+freelancer -> 409
- `test_sign_contract_client` — Client signs, verify `client_signed=True`
- `test_sign_contract_freelancer` — Freelancer signs, verify `freelancer_signed=True`
- `test_sign_contract_status_transition` — Both sign -> status `pending_funding`
- `test_sign_contract_already_signed` — Double sign -> 400
- `test_fund_contract` — Fund with correct user -> status `active`
- `test_fund_contract_not_owner` — Wrong user -> 403
- `test_fund_contract_wrong_status` — Not `pending_funding` -> 400
- `test_submit_milestone` — Valid submission -> status `submitted`
- `test_submit_milestone_not_freelancer` — Client tries -> 403
- `test_submit_milestone_already_submitted` -> 400
- `test_approve_milestone` -> status `approved`, `tx_hash` returned
- `test_approve_milestone_not_submitted` -> 400
- `test_approve_milestone_auto_complete` — Last milestone approved -> contract `completed`
- `test_reject_milestone` -> status resets to `pending`, CID cleared
- `test_get_milestones` — Verify list endpoint
- `test_get_milestones_not_party` -> 403

### Task 5A.2: Backend Unit Tests — Disputes & Admin
**Assignee**: Anushree  
**Files**: `tests/backend/test_disputes.py`, `tests/backend/test_admin.py` (new)  
**Est. time**: 0.5 day

**Tests**:
- `test_raise_dispute` — Create dispute, verify `open` status
- `test_raise_dispute_on_active_contract` — Only active/disputable contracts
- `test_raise_dispute_duplicate` -> 400
- `test_get_disputes` — List disputes with filters
- `test_get_disputes_unauthorized` -> 401
- `test_admin_resolve_dispute_release` -> status `resolved`, decision `release`
- `test_admin_resolve_dispute_refund` -> status `resolved`, decision `refund`
- `test_admin_resolve_already_resolved` -> 400
- `test_admin_list_users` -> paginated list
- `test_admin_toggle_user_active` -> suspend/activate
- `test_admin_stats` -> correct counts

### Task 5A.3: Backend Unit Tests — Messaging
**Assignee**: Anushree  
**Files**: `tests/backend/test_messages.py` (new)  
**Est. time**: 0.5 day

**Tests**:
- `test_send_message` -> verify created
- `test_send_message_to_self` -> 400
- `test_get_conversations` -> list with last message
- `test_get_conversation_messages` -> paginated
- `test_unread_count` -> verify tracking

### Task 5A.4: Backend Unit Tests — Proposals
**Assignee**: Anushree  
**Files**: `tests/backend/test_proposals.py` (new)  
**Est. time**: 0.5 day

**Tests**:
- `test_submit_proposal` -> verify created
- `test_submit_proposal_duplicate` -> 409 (unique constraint)
- `test_submit_proposal_closed_job` -> 400
- `test_get_proposals_for_job` -> client-only
- `test_get_my_proposals` -> freelancer's own
- `test_accept_proposal` -> status `accepted`
- `test_reject_proposal` -> status `rejected`
- `test_get_received_proposals` -> client's job proposals

### Task 5A.5: Backend Unit Tests — Auth Edge Cases
**Assignee**: Anushree  
**Files**: `tests/backend/test_auth.py` (update existing)  
**Est. time**: 0.5 day

**Tests to add**:
- `test_login_expired_nonce` -> 401
- `test_login_invalid_signature` -> 401
- `test_login_duplicate_address` -> link to existing user
- `test_refresh_expired_token` -> 401
- `test_access_expired_token` -> 401
- `test_logout_blacklists_token` -> second use 401
- `test_metamask_login_with_role` -> new user gets role

### Task 5A.6: Backend Integration Tests
**Assignee**: Pawan  
**Files**: `tests/integration/` (new)  
**Est. time**: 2 days

**Test scenarios**:
- `test_full_contract_lifecycle`:
  1. Create job (client)
  2. Submit proposal (freelancer)
  3. Accept proposal (client)
  4. Create contract (client)
  5. Both sign
  6. Fund contract
  7. Submit milestone (freelancer)
  8. Approve milestone (client)
  9. Verify milestone paid
  10. Verify contract completed
- `test_dispute_lifecycle`:
  11. Create contract -> active
  12. Raise dispute
  13. Admin resolves with refund
  14. Verify contract cancelled
- `test_ipfs_milestone_flow`:
  15. Upload file to IPFS -> get CID
  16. Submit milestone with CID
  17. Verify deliverable_cid stored
  18. Download via CID -> verify content

### Task 5A.7: Frontend Unit Tests
**Assignee**: Bijee  
**Files**: `frontend/src/**/*.test.js` (new)  
**Est. time**: 1.5 days

**Components to test**:
- `ProposalForm` — Form validation, submit handler, error display, already-applied detection
- `ClientDashboard` — Stats computation, proposal display, job posting form
- `FreelancerDashboard` — Stats, contracts list, proposals list
- `ContractDetailPage` — Sign flow, approve/reject, dispute display
- `ExploreJobs` — Filtering, loading states
- `JobDetail` — Apply button visibility (freelancer vs client vs owner)
- `AdminPanel` — Tab switching, dispute resolution, user suspend

### Task 5A.8: Smart Contract Edge Cases
**Assignee**: Sarun  
**Files**: `contracts/test/GigEscrow.test.js` (update)  
**Est. time**: 0.5 day

**Tests to add**:
- Reentrancy attempt on `approveMilestone`
- Unauthorized address calling admin-only `resolveDispute`
- Overflow check on milestone amounts
- Contract creation with zero milestones
- `cancelContract` after funding (should fail)
- Duplicate dispute raise attempt

---

## Phase 5B: UX Polish (Days 8-14)

### Task 5B.1: Server-Side ExploreJobs Search
**Assignee**: Bijee  
**Files**: `frontend/src/pages/ExploreJobs.js`, `backend/app/routers/jobs.py`  
**Est. time**: 0.5 day

**Changes**:
- Backend: Add `?q=` query param to `GET /jobs` that searches `title` and `description`
- Frontend: Pass search input value as `q` param to API (remove client-side filter)
- Add `?skill=` filter support

### Task 5B.2: Raise Dispute Button on Contract Detail
**Assignee**: Bijee  
**Files**: `frontend/src/pages/ContractDetailPage.js`  
**Est. time**: 0.5 day

**Changes**:
- Add "Raise Dispute" button when contract is `active` or `pending_funding`
- Modal with reason textarea and `raised_by` selection
- Calls `POST /contracts/{id}/disputes`
- Show success/error state
- Refresh contract detail on success

### Task 5B.3: Proposal Acceptance -> Auto-Create Contract
**Assignee**: Anushree  
**Files**: `backend/app/routers/proposals.py`, `backend/app/services/contract_service.py`  
**Est. time**: 1 day

**Changes**:
- When `PUT /proposals/{id}` with `status: "accepted"`:
  1. Extract job data (budget, title, skills)
  2. Auto-create `Contract` with:
     - `job_id` from proposal
     - `client_id` from job
     - `freelancer_id` from proposal
     - `title` from job
     - `total_amount` = bid_amount
     - Single milestone with `amount` = bid_amount
     - Status = `pending_review`
  3. Store `contract_id` on proposal
  4. Return contract in response
- Notify both parties (if notification system exists)

### Task 5B.4: Clean Up Unused Component Trees
**Assignee**: Bijee  
**Files**: Multiple in `frontend/src/components/`  
**Est. time**: 0.5 day

**Changes**:
- Remove: `components/Auth/`, `components/Landing/`, `components/pages/` (if unused)
- Remove: any `.js` files not imported by `App.js` or shared components
- Archive `bijee_frontend/` to `archive/bijee_frontend/`

### Task 5B.5: Design System Unification
**Assignee**: Bijee  
**Files**: `frontend/src/css/styles.css`, `bijee_frontend/`  
**Est. time**: 1 day

**Changes**:
- Extract CSS variables and component styles from Bijee's HTML prototypes
- Unify: card styles, button variants, badge colors, modal patterns
- Apply consistent spacing, typography (Sora font), color palette
- Remove duplicate CSS rules

### Task 5B.6: Notifications System
**Assignee**: Runa (backend), Bijee (frontend)  
**Files**: `backend/app/models/models.py`, `backend/app/routers/notifications.py`, `frontend/src/services/api.js`, `frontend/src/components/shared/Navbar.js`  
**Est. time**: 2 days

**Backend changes**:
- Add `Notification` model:
  - `id`, `user_id`, `type` (proposal, contract, milestone, dispute, message), `title`, `message`, `related_id`, `read`, `created_at`
- Add `GET /api/notifications` (user's notifications, paginated)
- Add `PUT /api/notifications/{id}/read` (mark single)
- Add `PUT /api/notifications/read-all` (mark all read)
- Emit notifications at key events:
  - Proposal submitted -> client
  - Proposal accepted/rejected -> freelancer
  - Contract signed -> both parties
  - Contract funded -> freelancer
  - Milestone submitted -> client
  - Milestone approved -> freelancer
  - Dispute raised -> admin
  - Dispute resolved -> both parties
  - Message received -> receiver

**Frontend changes**:
- Add notification badge to Navbar (bell icon with count)
- Notification dropdown with recent items
- Mark-as-read on click
- Link to relevant page (contract, job, message)

---

## Phase 5C: Security Hardening (Days 15-18)

### Task 5C.1: Redis-Backed Rate Limiting
**Assignee**: Pawan  
**Files**: `backend/app/middleware/rate_limit.py` (new), `backend/app/main.py`  
**Est. time**: 1 day

**Implementation**:
- Use `slowapi` library or custom middleware with Redis
- Limits:
  - Auth endpoints: 10 req/min per IP
  - General API: 100 req/min per user
  - IPFS upload: 20 req/min per user
- Return `429 Too Many Requests` with `Retry-After` header
- Configuration via `settings.py`

### Task 5C.2: CORS Hardening
**Assignee**: Pawan  
**Files**: `backend/app/main.py`  
**Est. time**: 0.5 day

**Changes**:
- Replace `allow_origins=["*"]` with specific origins:
  - Dev: `["http://localhost:3000", "http://localhost:3001"]`
  - Prod: `["https://freeledger.example.com"]`
- Read from `settings.py`: `cors_origins: list[str]`

### Task 5C.3: Input Sanitization
**Assignee**: Pawan  
**Files**: `backend/app/utils/sanitizer.py` (new)  
**Est. time**: 0.5 day

**Implementation**:
- Strip HTML tags from text fields (job description, message content, bio, cover letter)
- Use `bleach` library or custom regex
- Apply in Pydantic validators or middleware
- Prevent stored XSS in all user-generated content

### Task 5C.4: Private Key Management Docs
**Assignee**: Sarun  
**Files**: `docs/security/key-management.md` (new)  
**Est. time**: 0.5 day

**Documentation**:
- How keys are used currently (env var for client operations)
- Production recommendations:
  - Use HashiCorp Vault / AWS KMS / Azure Key Vault
  - Multi-signature wallet for admin operations
  - Separate key per contract or per client
  - Regular key rotation procedure
- Emergency key recovery procedure

### Task 5C.5: JWT Secret Rotation Support
**Assignee**: Anushree  
**Files**: `backend/app/config.py`, `backend/app/middleware/auth.py`  
**Est. time**: 0.5 day

**Changes**:
- Support `jwt_secret_previous` in settings
- During token validation, try current secret first, then previous
- Log warning when previous secret is used (signals rotation needed)
- Document rotation procedure

---

## Phase 5D: Infrastructure & DevOps (Days 17-19)

### Task 5D.1: Dockerize Backend
**Assignee**: Pawan  
**Files**: `docker/backend/Dockerfile`, `docker/docker-compose.yml` (update)  
**Est. time**: 1 day

**Implementation**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Task 5D.2: Dockerize Frontend
**Assignee**: Bijee  
**Files**: `docker/frontend/Dockerfile`, `docker/frontend/nginx.conf`, `docker/docker-compose.yml` (update)  
**Est. time**: 1 day

**Implementation**:
```dockerfile
FROM node:18 AS build
WORKDIR /app
COPY frontend/package*.json .
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### Task 5D.3: Environment-Agnostic Config
**Assignee**: Runa  
**Files**: `backend/.env.dev`, `backend/.env.staging`, `backend/.env.production`, `backend/app/config.py`  
**Est. time**: 0.5 day

**Implementation**:
- `.env.dev` — localhost URLs, debug mode
- `.env.staging` — staging URLs, verbose logging
- `.env.production` — production URLs, minimal logging, JWT rotation keys
- Add `ENVIRONMENT` setting that selects which file to load
- Validate required settings per environment at startup

### Task 5D.4: Deployment Guide
**Assignee**: Runa  
**Files**: `docs/deployment.md` (new)  
**Est. time**: 1 day

**Content**:
- Prerequisites (Docker, Docker Compose, node, python)
- Infrastructure setup (PostgreSQL, Redis, IPFS, Hardhat)
- Smart contract deployment
- Backend deployment (Docker or bare metal)
- Frontend deployment (Docker with nginx)
- Environment variables reference
- Health check endpoints
- Backup procedures (DB dumps, IPFS pinning)
- Monitoring setup
- Troubleshooting common issues

---

## Phase 5E: Real-Time & Performance (Days 20-23)

### Task 5E.1: WebSocket Messaging Backend
**Assignee**: Anushree  
**Files**: `backend/app/routers/ws.py` (new), `backend/app/main.py`, `backend/app/redis_client.py`  
**Est. time**: 1.5 days

**Implementation**:
- Add `websockets` dependency to `requirements.txt`
- Create WebSocket endpoint: `ws://host/ws/{user_id}?token={jwt}`
- Authenticate via JWT query param
- Redis pub/sub channels:
  - `user:{user_id}:messages` — new message notification
  - `user:{user_id}:notifications` — new notification
- When `POST /messages/send` is called, publish event to receiver's channel
- Frontend subscribes to own channel, pops notification/toast
- Fallback: polling every 30s if WebSocket unavailable

### Task 5E.2: WebSocket Frontend Integration
**Assignee**: Bijee  
**Files**: `frontend/src/hooks/useWebSocket.js` (new), `frontend/src/pages/Messages.js`  
**Est. time**: 1 day

**Implementation**:
- `useWebSocket` hook:
  - Connect to `ws://host/ws/{userId}?token={jwt}`
  - Auto-reconnect on disconnect (exponential backoff)
  - Parse message types: `new_message`, `notification`
  - For `new_message`: refresh conversation list + append to open conversation
  - For `notification`: show toast + update badge count
- Update Messages page to use WebSocket for real-time updates
- Show typing indicators (future enhancement)

### Task 5E.3: Load Testing
**Assignee**: Pawan  
**Files**: `tests/load/locustfile.py` (new) or `tests/load/k6-script.js` (new)  
**Est. time**: 1 day

**Implementation**:
- Locust or k6 script:
  - Scenario 1: Browse jobs (100 users, 10s ramp-up)
  - Scenario 2: Login + create proposal (50 users)
  - Scenario 3: Full contract lifecycle (20 users)
  - Scenario 4: Mixed workload (80 users)
- Measure:
  - P50/P95/P99 response times
  - Error rate
  - Throughput (requests/sec)
- Target: P95 < 1.5s for read endpoints, P95 < 3s for write endpoints

### Task 5E.4: API Response Time Monitoring
**Assignee**: Runa  
**Files**: `backend/app/middleware/timing.py` (new), `backend/app/main.py`  
**Est. time**: 0.5 day

**Implementation**:
- Add timing middleware that measures request duration
- Log: method, path, status_code, duration_ms
- For endpoints > 2s: log WARNING with full context
- Export metrics endpoint: `GET /api/metrics` (for Prometheus if desired)
- Track in Redis: endpoint hit counts, average latency

### Task 5E.5: IPFS + Event Listener Health Checks
**Assignee**: Pawan  
**Files**: `backend/app/routers/health.py` (new)  
**Est. time**: 0.5 day

**Implementation**:
- Enhanced `GET /api/health` response:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "services": {
      "postgresql": "connected",
      "redis": "connected",
      "ipfs": "connected",
      "blockchain": "connected",
      "event_listener": {
        "running": true,
        "last_poll_block": 1423,
        "last_poll_time": "2026-06-11T12:00:00Z"
      }
    }
  }
  ```
- IPFS check: `POST /api/v0/version` to Kubo API
- Blockchain check: `web3.eth.block_number`
- Event listener: store last poll timestamp + block in Redis, include in health

---

## Phase 5F: Final Polish (Days 24-25)

### Task 5F.1: Documentation Updates
**Assignee**: All  
**Est. time**: 1 day

**Changes**:
- Update `docs/plantuml/05_State_Machine.puml` to match actual `ContractStatus` enum
- Update `docs/plantuml/11a_Domain_Models.puml` to show all contract statuses
- Sync `database/schema.sql` with SQLAlchemy `models.py`
- Update `README.md` with new setup instructions if Docker Compose changed
- Update `Technology_Stack.txt` with final versions

### Task 5F.2: Bug Bash
**Assignee**: All  
**Est. time**: 1 day

**Checklist**:
- [ ] All API endpoints return correct status codes
- [ ] All frontend pages load without console errors
- [ ] MetaMask login -> role selection -> correct dashboard
- [ ] Email login works as fallback
- [ ] Job creation -> appears in browse
- [ ] Proposal submission -> appears in client dashboard
- [ ] Contract creation -> sign -> fund -> active
- [ ] Milestone submit -> approve -> payment
- [ ] Dispute creation -> admin sees it -> resolve
- [ ] Messages: send -> appear in receiver's conversation
- [ ] Profile editing -> saves correctly
- [ ] Admin panel: all tabs load, actions work
- [ ] IPFS upload -> download -> verify content
- [ ] Mobile responsiveness (basic check)
- [ ] All tests pass: `npm test`, `pytest`, `npx hardhat test`

---

## Effort Summary by Team Member

| Team Member | Phase 5A | Phase 5B | Phase 5C | Phase 5D | Phase 5E | Phase 5F | Total |
|---|---|---|---|---|---|---|---|
| **Anushree** | 4 days | 1 day | 0.5 day | — | 1.5 days | 1 day | **8 days** |
| **Pawan** | 2 days | — | 2 days | 1 day | 1.5 days | 1 day | **7.5 days** |
| **Bijee** | 1.5 days | 4 days | — | 1 day | 1 day | 1 day | **8.5 days** |
| **Sarun** | 0.5 day | — | 0.5 day | — | — | 1 day | **2 days** |
| **Runa** | — | 2 days | — | 1.5 days | 0.5 day | 1 day | **5 days** |
| **Total** | **8 days** | **7 days** | **3 days** | **3.5 days** | **4.5 days** | **5 days** | **~31 person-days** |

---

## Key Milestones

| Milestone | Target Date | Deliverable |
|---|---|---|
| All backend tests passing | Day 7 | `pytest` -> 100% pass |
| UX gaps closed | Day 14 | No remaining "Missing" items in audit |
| Security hardened, apps dockerized | Day 19 | `docker compose up --build` runs everything |
| Real-time messaging working | Day 22 | Messages appear without page refresh |
| Project deliverable-ready | Day 25 | All tests pass, docs updated, diagrams match |
