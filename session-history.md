# Session History — Runa Maphu (System Workflow Engineer / API Architect)

## Context
- **Project**: FreeLedger — A decentralized freelance protocol with Web3 integration
- **Role**: System Workflow Engineer and API Architect
- **Responsibility**: Build 7 FastAPI endpoints with two-phase commit protocol

## Tools Required
- FastAPI (already in use)
- AsyncWeb3 (was using sync web3 — I added async variants)
- asyncpg (via SQLAlchemy async driver, already configured)
- ipfshttpclient (was using httpx directly to IPFS API — kept httpx)

## State Machine Rules
```
Milestone: PENDING → IN_PROGRESS → SUBMITTED → APPROVED
                           ↘  REJECTED   ↗
```
- `PENDING` = milestone awaiting work
- `IN_PROGRESS` = contract funded, milestone ready for submission
- `SUBMITTED` = freelancer uploaded deliverable + called blockchain
- `APPROVED` = client approved on-chain, payment released
- `REJECTED` = client rejected on-chain, milestone returns to resubmittable state

## Two-Phase Commit Protocol
```
[Phase 1] Call smart contract (blockchain)
[Phase 2] WAIT for transaction receipt
[Phase 3] ONLY THEN update PostgreSQL database
```
Blockchain is source of truth. DB is cache/index. Event listener reconciles inconsistencies.

## The 7 Endpoints

| # | Endpoint | Route | Status |
|---|---|---|---|
| 1 | Wallet login | `POST /api/auth/login` | ✅ Already existed |
| 2 | Create project | `POST /api/contracts/` | ✅ Already existed (IPFS term upload) |
| 3 | Submit milestone | `POST /api/contracts/{id}/milestones/{index}/submit` | ✅ Fixed — now accepts file upload, uploads to IPFS, calls blockchain submitMilestone, waits, then updates DB |
| 4 | Approve milestone | `POST /api/contracts/{id}/milestones/{index}/approve` | ✅ Fixed — blockchain first, wait receipt, then DB |
| 5 | Reject milestone | `POST /api/contracts/{id}/milestones/{index}/reject` | ✅ Fixed — now calls rejectMilestone on-chain before DB |
| 6 | Project status | `GET /api/contracts/{id}/status` | ✅ New — consolidated contract + milestone statuses |
| 7 | Project history | `GET /api/contracts/{id}/history` | ✅ New — full audit trail |

## Files Changed (6 files)

### 1. `backend/app/services/blockchain_service.py`
- Added AsyncWeb3 support: `get_async_web3()`, `get_async_contract()`, `_send_and_wait()`
- Added async blockchain functions:
  - `async_create_contract_on_chain()`
  - `async_fund_contract_on_chain()`
  - `async_submit_milestone_on_chain()`
  - `async_approve_milestone_on_chain()`
  - `async_reject_milestone_on_chain()` — **NEW** (didn't exist before)
  - `async_get_contract_state()`
- Kept all existing sync functions for backward compatibility

### 2. `backend/app/services/contract_service.py` (full rewrite)
- **Two-phase commit**: Blockchain FIRST → wait tx receipt → THEN update DB
- **`submit_milestone()`**: Now accepts `BinaryIO` file, uploads to IPFS internally, calls `async_submit_milestone_on_chain`, waits, updates DB
- **`approve_milestone()`**: Calls `async_approve_milestone_on_chain` first, waits, updates DB only after confirmation
- **`reject_milestone()`**: Calls `async_reject_milestone_on_chain` first, waits, sets status to `rejected` + stores rejection_reason
- **`get_project_status()`**: Returns consolidated contract + milestone status
- **`get_project_history()`**: Returns MilestoneEvent audit trail ordered by time
- **`_record_event()`**: Helper to insert audit trail entries
- All milestones start at `pending`, after funding they go to `in_progress` (via event), submit requires `pending` or `rejected`
- Added `rejection_reason` persistence

### 3. `backend/app/routers/contracts.py` (updated)
- Submit now takes `UploadFile` instead of `deliverable_cid` string
- Added `GET /{contract_id}/status` returning `ProjectStatusResponse`
- Added `GET /{contract_id}/history` returning `ProjectHistoryResponse`
- All milestone operations now go through the two-phase commit service layer

### 4. `backend/app/models/models.py`
- Added `rejection_reason` column to `ContractMilestone`
- Added `MilestoneEvent` model for audit trail:
  - `milestone_id`, `contract_id`, `from_status`, `to_status`, `tx_hash`, `triggered_by`, `reason`, `created_at`

### 5. `backend/app/schemas/schemas.py`
- Added `MilestoneEventResponse` — Pydantic model for audit events
- Added `ProjectStatusMilestone` — per-milestone status summary
- Added `ProjectStatusResponse` — consolidated contract + milestone status
- Added `ProjectHistoryResponse` — list of `MilestoneEventResponse`
- Added `rejection_reason` to `MilestoneResponse`

### 6. `backend/app/services/event_listener.py` (safety net)
- Added `process_milestone_submitted()` — reconciles milestone to submitted if DB missed it
- Added `process_milestone_rejected()` — reconciles milestone to rejected if DB missed it
- Polling now fetches `MilestoneSubmitted` and `MilestoneRejected` events too
- This provides the compensating transaction for the two-phase commit pattern

## Key Architectural Decisions
1. **Submit endpoint accepts file upload** — uploads to IPFS internally, no separate IPFS step needed
2. **Milestone `rejected` status** — reject sets DB to `rejected` (not `pending`), allows resubmit from `rejected` or `pending`
3. **Event listener as safety net** — if two-phase commit fails after blockchain success, listener reconciles
4. **AsyncWeb3** — all new blockchain functions are async to match FastAPI async pattern
5. **Sync functions kept** — existing sync `web3` functions retained for backward compatibility
