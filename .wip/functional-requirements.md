# FreeLedger — Functional Requirements

Extracted from Proposal (Table 3: Project Objectives) and API spec.

---

## FR-1: Decentralized Storage Layer
- **Description**: Implement IPFS (via Kubo) for immutable, censorship-resistant content storage
- **Status**: ✅ **Fully Implemented**
- **Backend**: `ipfs_service.py` — upload, download, pin verified end-to-end
- **Frontend**: `ipfs.js` service exists, `uploadFile` wired
- **Verification**: Test upload returned CID `QmXrxQa6KwxnqCyLDoF6XENB46jhbos41HHZcoNNCccUX9`, download confirmed content matches

---

## FR-2: Smart Contract Escrow System
- **Description**: State-machine-based Solidity smart contracts for trustless escrow and payment mediation
- **Status**: ✅ **Fully Implemented**
- **Smart Contract**: `GigEscrow.sol` — fully implemented with 24 passing tests
- **Backend**: `blockchain_service.py` fully wired:
  - `create_contract_on_chain` — uses `CLIENT_PRIVATE_KEY` from env
  - `fund_contract_on_chain` — callable via `POST /api/contracts/{id}/fund`
  - `approve_milestone_on_chain` — called automatically on milestone approval

---

## FR-3: Wallet-Based Identity Layer
- **Description**: MetaMask + ECDSA signature recovery for secure, passwordless authentication
- **Status**: ✅ **Fully Implemented**
- **Backend**: Auth router with challenge/login/refresh/logout/me, ECDSA recovery via `eth_account`
- **Frontend**: MetaMask `connect()` + `signMessage()`, JWT storage, auto-refresh interceptor
- **Extra**: Email auth also added as fallback

---

## FR-4: Hybrid Architecture (Off-chain + On-chain)
- **Description**: PostgreSQL for metadata indexing, smart contracts for security anchors
- **Status**: ✅ **Fully Implemented**
- **Off-chain**: All ORM models, 2 Alembic migrations, full API
- **On-chain**: Contract deployed, ABI exported, addresses configured

---

## FR-5: Rule-Based Project Matching & Structured Search
- **Description**: Rule-based matching algorithm via FastAPI to suggest freelancers based on skills, roles, availability
- **Status**: ❌ **Not Implemented**
- **Note**: Jobs have search/filter (category, skill, budget) but no dedicated matching/recommendation endpoint exists
- **Frontend dashboard shows "Recommended Jobs" section but no API call powers it**

---

## FR-6: Performance Validation
- **Description**: Compare protocol via simulations — latency < 1.5s, storage availability > 95%
- **Status**: ❌ **Not Implemented**
- **Note**: No performance benchmarks or load tests exist

---

## FR-7: Cryptographically Linked Deliverables
- **Description**: Link submitted work (CID) with contract state transitions
- **Status**: ✅ **Fully Implemented**
- Milestone submit stores `deliverable_cid`, contract state transitions enforced

---

## FR-8: Transparent Contract State Transitions
- **Description**: Publicly verifiable contract execution without centralized arbitration
- **Status**: ✅ **Fully Implemented**
- Full state machine in Solidity + DB mirroring
- Blockchain event listener polls `PaymentReleased`, `DisputeRaised`, `DisputeResolved` events

---

## FR-9: Proposal System
- **Description**: Freelancers submit proposals to jobs; clients accept/reject
- **Status**: ✅ **Fully Implemented**
- `POST /jobs/{id}/proposals`, `GET /proposals/mine`, `PUT /proposals/{id}`

---

## FR-10: Job CRUD
- **Description**: Clients post, browse, search, filter, update, close jobs
- **Status**: ✅ **Fully Implemented**
- `POST/GET /jobs`, `GET/PUT/DELETE /jobs/{id}` with category/skill/budget filters

---

## FR-11: Contract Lifecycle
- **Description**: Create contracts with milestones, signing workflow, status tracking
- **Status**: ✅ **Fully Implemented**
- Off-chain create/sign works on-chain deploy (via `CLIENT_PRIVATE_KEY`) and funding via `POST /api/contracts/{id}/fund`

---

## FR-12: Milestone Workflow
- **Description**: Freelancers submit deliverables, clients approve/reject, payments release
- **Status**: ✅ **Fully Implemented**
- Submit/approve/reject wired in DB; on-chain payment release called on approval; event listener syncs `paid` status

---

## FR-13: Dispute Management
- **Description**: Raise disputes on contracts, admin reviews and resolves
- **Status**: ✅ **Fully Implemented**
- Create dispute, list disputes, admin resolve with refund/release decision
- On-chain `DisputeRaised`/`DisputeResolved` events picked up by background event listener

---

## FR-14: Messaging System
- **Description**: Direct messaging between clients and freelancers
- **Status**: ✅ **Fully Implemented**
- Conversations list, per-user conversation, send message

---

## FR-15: User Profiles
- **Description**: Edit username, bio, skills, hourly rate, avatar
- **Status**: ✅ **Fully Implemented**
- `PUT /users/me`, `GET /users/{id}`

---

## FR-16: Admin Panel
- **Description**: User management, platform stats, dispute resolution
- **Status**: ✅ **Fully Implemented**
- Admin dispute list/resolve, user list, stats (users, contracts, volume, fees, disputes)

---

## FR-17: IPFS File Upload/Download
- **Description**: Upload deliverables to IPFS via backend, download by CID
- **Status**: ✅ **Fully Implemented**
- `POST /api/ipfs/upload`, `GET /api/ipfs/download/{cid}` — verified end-to-end
- Frontend `uploadFile` wired and functional

---

## FR-18: Blockchain Event Listener
- **Description**: Background worker polling `MilestoneApproved`, `DisputeRaised`, `DisputeResolved` events to sync DB
- **Status**: ✅ **Implemented**
- `backend/app/services/event_listener.py` — background asyncio task polling blockchain events every 5 seconds
- Automatically starts when `CLIENT_PRIVATE_KEY` is configured
- Synced states: milestone → `paid`, contract → `disputed`/`completed`
