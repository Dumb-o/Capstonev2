# FreeLedger — Implementation Plan for Critical Gaps

## Phase 1: Blockchain Integration (Critical)

### 1.1 Fix Private Key Management
- Move private key from hardcoded `""` to environment variable
- Update `.env.example`, `backend/.env`, and `settings.py` with `CLIENT_PRIVATE_KEY`
- **Files**: `backend/app/config.py`, `backend/app/routers/contracts.py`, `backend/app/services/contract_service.py`

### 1.2 Wire Contract Funding Flow
- Add `POST /contracts/{id}/fund` endpoint
- Call `fund_contract_on_chain()` with client's private key
- Update contract status to `active` after funding (if both signed) or `pending_funding`
- **Files**: `backend/app/routers/contracts.py`, `backend/app/services/contract_service.py`

### 1.3 Wire Milestone Approval → On-Chain Payment
- Call `approve_milestone_on_chain()` inside `contract_service.approve_milestone()`
- Return `tx_hash` in approval response
- **Files**: `backend/app/services/contract_service.py`, `backend/app/schemas/schemas.py`

### 1.4 Create Blockchain Event Listener
- Background async task polling `PaymentReleased` and `DisputeRaised` events
- Update milestone status to `paid` when `PaymentReleased` fires
- Update contract status to `disputed` when `DisputeRaised` fires
- **Files**: `backend/app/services/event_listener.py` (new), `backend/app/main.py` (wire startup)

### 1.5 Wire Dispute Resolution On-Chain
- Call `resolveDispute` on smart contract when admin resolves a dispute
- **Files**: `backend/app/routers/admin.py`, `backend/app/services/blockchain_service.py`

## Phase 2: IPFS Verification

### 2.1 Verify IPFS Connectivity
- Test IPFS upload/download end-to-end
- Ensure IPFS Docker container is healthy and reachable
- Verify frontend can upload files through backend proxy

## Phase 3: Testing

### 3.1 Add Backend Integration Tests
- Test full contract creation → funding → milestone → approval flow
- Test dispute creation → admin resolution flow
- Test with mocked blockchain calls

## Phase 4: Rule-Based Matching (Sprint 4 feature)

### 4.1 Implement Matching Endpoint
- `GET /api/recommendations/freelancers` for clients
- `GET /api/recommendations/jobs` for freelancers
- Rule-based: match by skills overlap, budget range, category
