# FreeLedger — Codebase Knowledge Base

## Repository Structure

```
Capstone_Pawan_Completed/
├── backend/                      # Python FastAPI application
│   └── app/
│       ├── main.py              # App entry point, middleware, CORS, router registration
│       ├── config.py            # Settings (pydantic-settings from .env)
│       ├── database.py          # Async SQLAlchemy engine + session factory
│       ├── models/              # SQLAlchemy ORM models (PostgreSQL)
│       │   ├── user.py          # User, Admin models
│       │   ├── job.py           # Job model
│       │   ├── proposal.py      # Proposal model
│       │   ├── contract.py      # Contract, Milestone models
│       │   ├── message.py       # Message, Conversation models
│       │   ├── dispute.py       # Dispute model
│       │   └── admin.py         # AuditLog model
│       ├── schemas/             # Pydantic request/response schemas
│       │   ├── auth.py          # Auth challenge/login schemas
│       │   ├── user.py          # User profile schemas
│       │   ├── job.py           # Job CRUD schemas
│       │   ├── proposal.py      # Proposal schemas
│       │   ├── contract.py      # Contract schemas
│       │   ├── message.py       # Message schemas
│       │   ├── dispute.py       # Dispute schemas
│       │   └── admin.py         # Admin CRUD schemas
│       ├── routers/             # API route handlers
│       │   ├── auth.py          # Authentication endpoints
│       │   ├── user.py          # User profile endpoints
│       │   ├── job.py           # Job CRUD, search, filter endpoints
│       │   ├── proposal.py      # Proposal submission/management endpoints
│       │   ├── contract.py      # Contract lifecycle endpoints
│       │   ├── message.py       # Messaging endpoints
│       │   ├── dispute.py       # Dispute endpoints
│       │   ├── admin.py         # Admin dashboard endpoints
│       │   └── health.py        # Health check endpoint
│       ├── services/            # Business logic layer
│       │   ├── auth_service.py          # JWT creation/validation, hashing
│       │   ├── blockchain_service.py    # Web3 contract interactions
│       │   ├── ipfs_service.py          # IPFS upload/download/pin
│       │   ├── event_listener.py        # Polls on-chain events (background task)
│       │   ├── contract_service.py      # Contract lifecycle logic
│       │   ├── recommendation_service.py # Skill-based job matching
│       │   └── repin_service.py         # Periodic IPFS repinning
│       ├── middleware/
│       │   ├── auth.py          # JWT dependency injection
│       │   ├── rate_limit.py    # Redis-backed rate limiter
│       │   └── sanitizer.py     # HTML tag stripping
│       ├── utils/
│       │   └── exceptions.py    # Custom exception classes
│       └── __init__.py
├── frontend/                     # React 18 application
│   └── src/
│       ├── App.js                # Root component, routing
│       ├── index.js              # Entry point
│       ├── context/
│       │   ├── AuthContext.js     # Auth state management
│       │   └── Web3Context.js     # MetaMask connection state
│       ├── hooks/
│       │   ├── useAuth.js         # Auth operations hook
│       │   ├── useWeb3.js         # Web3 operations hook
│       │   ├── useApi.js          # Generic API call hook
│       │   └── useContract.js     # Smart contract interaction hook
│       ├── services/
│       │   ├── api.js             # Axios instance, interceptors (JWT)
│       │   └── auth.js            # Wallet login/logout logic
│       ├── pages/
│       │   ├── Login.js           # Wallet + email login page
│       │   ├── Dashboard.js       # Client/Freelancer dashboard
│       │   ├── FindJobs.js        # Job marketplace
│       │   ├── JobDetail.js       # Job view + proposal submission
│       │   ├── ProposalList.js    # Proposal review
│       │   ├── ContractDetail.js  # Contract + milestone management
│       │   ├── MilestoneDetail.js # Milestone view
│       │   ├── Messages.js        # Messaging interface
│       │   ├── Profile.js         # User profile
│       │   ├── AdminPanel.js      # Admin dashboard (7 tabs)
│       │   └── LandingPage.js     # Home/landing page
│       └── components/
│           ├── Navbar.js          # Top navigation bar
│           ├── Sidebar.js         # Role-aware sidebar
│           ├── Footer.js          # Page footer
│           ├── ProtectedRoute.js  # Auth guard wrapper
│           └── LoadingSpinner.js  # Loading indicator
├── contracts/                     # Solidity smart contracts
│   ├── contracts/
│   │   └── GigEscrow.sol         # Escrow contract (Solidity 0.8.20)
│   ├── scripts/
│   │   └── deploy.js             # Hardhat deployment script
│   ├── test/                     # Hardhat tests
│   ├── hardhat.config.js         # Hardhat configuration
│   └── package.json
├── database/
│   └── schema.sql                # Legacy SQL schema reference
├── docker/
│   ├── docker-compose.yml        # Infrastructure services (postgres, redis, ipfs, hardhat)
│   └── Dockerfile                # Backend Dockerfile
├── docs/
│   ├── architecture/
│   │   ├── api-spec.md           # API specification
│   │   └── data-flow.md          # Architecture + data flow diagrams
│   └── plans/
│       └── sprint-plans.md       # Sprint plans and status
├── tests/
│   ├── backend/
│   │   ├── test_auth.py          # 4 auth tests
│   │   ├── test_ipfs.py          # 2 IPFS tests
│   │   ├── test_blockchain.py    # 7 blockchain service tests
│   │   └── test_integration.py   # 2 integration tests (full lifecycle)
│   └── frontend/                 # Empty
├── bijee_frontend/               # Removed in Queue-15 (redundant demo frontend)
├── README.md
├── Technology_Stack.txt
└── PORTS.txt
```

---

## Architecture Overview

### Hybrid Architecture

FreeLedger uses a **hybrid architecture** combining a traditional centralized web application with decentralized blockchain technology:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser    │────▶│   Frontend    │────▶│   Backend    │
│  (React 18)  │     │  (React App)  │     │ (FastAPI/Py) │
│ + MetaMask   │     │              │     │              │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │  Web3/Ethers.js                         │  SQLAlchemy
       ▼                                         ▼
┌──────────────┐                       ┌──────────────────┐
│  GigEscrow    │                       │   PostgreSQL DB   │
│  (Solidity)   │                       │ (Users, Jobs,    │
│  on Hardhat   │                       │  Proposals, Msgs) │
└──────────────┘                       └──────────────────┘
       │                                         │
       │  Events                           HTTP/IPFS
       ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│ Event Listener    │◀──────────────────▶│   IPFS (Kubo)    │
│ (BackgroundTask)  │                    │ (Contract terms, │
│ Polls logs/txns   │                    │  Deliverables)   │
└──────────────────┘                    └──────────────────┘
```

### Key Architectural Principles

1. **Centralized state for UX data**: Users, jobs, proposals, messages stored in PostgreSQL
2. **Decentralized trust for payments**: Escrow, milestones, disputes on Ethereum smart contract
3. **Immutable storage for evidence**: Contract terms and deliverables on IPFS
4. **Event-driven sync**: `event_listener.py` polls blockchain events to update database state

---

## Data Flow

### Authentication Flow (MetaMask)

```
1. User clicks "Connect Wallet"
2. Frontend (Web3Context) → MetaMask → returns address
3. Frontend (AuthContext) → POST /api/auth/challenge {address}
4. Backend (auth_service) → generates random nonce → stores in Redis (5min TTL)
5. Backend → returns {nonce: "Sign this: 0x..."}
6. Frontend (auth.js) → MetaMask → signs the nonce → returns signature
7. Frontend → POST /api/auth/login {address, signature, role}
8. Backend (auth_service) → verifies ECDSA signature against nonce in Redis
9. Backend (auth_service) → creates/updates user → generates JWT pair
10. Backend → returns {access_token, refresh_token, user}
11. Frontend stores tokens in localStorage
12. Axios interceptor attaches Authorization: Bearer header to all requests
13. On 401 → refresh_token used to get new access_token
14. On refresh failure → redirect to login
```

### Contract Lifecycle Flow

```
1. Proposal accepted → Contract auto-created (status: "draft")
2. Both parties sign → status: "pending_funding"
3. Client funds (ETH to smart contract) → status: "active"
4. Freelancer submits milestone → event: MilestoneSubmitted
5. Client approves milestone → event: MilestoneApproved
   → Smart contract releases escrowed funds to freelancer
6. Reject milestone → event: MilestoneRejected
7. All milestones done → contract complete
```

### Dispute Flow

```
1. Either party raises dispute → POST /api/disputes
2. Contract milestones unlocked → both sides frozen
3. Admin reviews → POST /api/admin/disputes/{id}/resolve
4. Choice: RELEASE (pay freelancer) or REFUND (return to client)
5. On-chain action executed via admin wallet
6. Contract state updated
```

---

## Database Schema

### Tables (SQLAlchemy Models)

| Table | Key Fields | Relationships |
|---|---|---|
| `users` | id, wallet_address, email, username, role, hashed_password, profile fields | has_many: jobs(owner), proposals, contracts(client/freelancer) |
| `admins` | id, user_id (FK) | belongs_to: user |
| `jobs` | id, title, description, budget, category, skills[], status, owner_id (FK) | belongs_to: user(owner) |
| `proposals` | id, job_id (FK), freelancer_id (FK), cover_letter, bid_amount, status | belongs_to: job, user(freelancer) |
| `contracts` | id, job_id (FK), client_id (FK), freelancer_id (FK), contract_address, amount, ipfs_hash, status | belongs_to: job, user(client), user(freelancer) |
| `milestones` | id, contract_id (FK), title, description, amount, status, deliverable_ipfs_hash | belongs_to: contract |
| `messages` | id, sender_id (FK), receiver_id (FK), conversation_id, content | belongs_to: user(sender/receiver) |
| `conversations` | id, participant_ids[], last_message_at | - |
| `disputes` | id, contract_id (FK), raised_by_id (FK), reason, status | belongs_to: contract, user(raised_by) |
| `audit_logs` | id, admin_id (FK), action, target_type, target_id, details | belongs_to: admin |

### Enum Mismatches

**Warning**: SQL enums in `database/schema.sql` do not match Python enums in `backend/app/models/`:

| Enum | schema.sql | models.py |
|---|---|---|
| JobStatus | ACTIVE, FILLED, COMPLETED, CANCELLED | active, filled, completed, cancelled |
| ProposalStatus | PENDING, ACCEPTED, REJECTED, WITHDRAWN | pending, accepted, rejected, withdrawn |
| ContractStatus | DRAFT, PENDING_FUNDING, ACTIVE, COMPLETED, DISPUTED, CANCELLED | draft, pending_funding, active, completed, disputed, cancelled |

---

## API Design

### Patterns

- **Base URL**: `/api`
- **Auth**: JWT Bearer token in `Authorization` header
- **Pagination**: `?skip=0&limit=20` (all list endpoints)
- **Error format**: `{detail: "message"}` (no error codes)
- **Role access**: Admin endpoints checked via `get_admin_user` dependency
- **Ownership**: Most endpoints filter by `current_user.id`

### Route Structure

| Router | Prefix | Key Endpoints |
|---|---|---|
| `routers/health.py` | `/api/health` | `GET /` — redis + db check |
| `routers/auth.py` | `/api/auth` | `POST /challenge`, `POST /login`, `POST /refresh`, `POST /email/register`, `POST /email/login`, `GET /me` |
| `routers/user.py` | `/api/users` | `GET /me`, `PUT /me`, `GET /{id}`, `GET /` (admin) |
| `routers/job.py` | `/api/jobs` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` |
| `routers/proposal.py` | `/api/proposals` | `GET /`, `POST /{job_id}`, `PUT /{id}` |
| `routers/contract.py` | `/api/contracts` | `GET /`, `POST /`, `POST /{id}/sign`, `POST /{id}/fund`, `POST /{id}/cancel`, `POST /{id}/milestones/{idx}/submit/approve/reject` |
| `routers/message.py` | `/api/messages` | `GET /conversations`, `POST /conversations`, `GET /conversations/{id}`, `POST /conversations/{id}`, `GET /conversations/{id}/unread-count` |
| `routers/dispute.py` | `/api/disputes` | `POST /`, `POST /contract/{contract_id}`, `GET /` (admin) |
| `routers/admin.py` | `/api/admin` | `GET /stats`, CRUD for users/jobs/proposals/contracts/messages, `POST /disputes/{id}/resolve` |

---

## Authentication & Authorization

### JWT Token System

```python
# backend/app/services/auth_service.py
# Access: 30 minute expiry
access_token = jwt.encode({"sub": user_id, "role": role, "type": "access"}, SECRET_KEY, algorithm="HS256", expires_delta=30)

# Refresh: 7 day expiry
refresh_token = jwt.encode({"sub": user_id, "role": role, "type": "refresh"}, SECRET_KEY, algorithm="HS256", expires_delta=7*24)
```

### Token Validation Flow
1. `middleware/auth.py:get_current_user` — extracts token from `Authorization` header
2. Decodes JWT, validates expiry, checks blacklist
3. Fetches user from DB by `sub` (user_id)
4. Returns `User` object or raises 401

### Token Refresh Flow
1. On 401 response, frontend interceptor calls `POST /api/auth/refresh`
2. Backend validates refresh token, checks not expired/blacklisted
3. Returns new access + refresh token pair

### Rate Limiting
- Redis-backed sliding window
- Configurable per-endpoint limits
- Keyed by user ID + route

### Blacklisting
- On logout, tokens added to Redis blacklist
- Blacklist checked on every request
- TTL matches token expiry

---

## Smart Contract

### GigEscrow.sol

```solidity
// contracts/contracts/GigEscrow.sol
// Solidity 0.8.20, OpenZeppelin ReentrancyGuard
```

### State Machine

```
Created → Active → Completed
                   ↓
              Disputed → Resolved (Release or Refund)
```

### Key Functions

| Function | Caller | Effect |
|---|---|---|
| `createContract(client, freelancer, termsHash)` | Platform | Creates escrow, emits `ContractCreated` |
| `fundContract()` | Client | Deposits ETH, emits `ContractFunded` |
| `submitMilestone(milestoneIndex, proofHash)` | Freelancer | Marks milestone submitted, emits `MilestoneSubmitted` |
| `approveMilestone(milestoneIndex)` | Client | Releases escrowed amount to freelancer, emits `MilestoneApproved` |
| `rejectMilestone(milestoneIndex)` | Client | Marks milestone rejected, emits `MilestoneRejected` |
| `raiseDispute(contractId, reason)` | Either party | Pauses contract, emits `DisputeRaised` |
| `resolveDispute(contractId, toFreelancer)` | Admin | Resolves dispute, emits `DisputeResolved` |
| `cancelContract(contractId)` | Either party | Before funding only, emits `ContractCancelled` |

### Events

```
ContractCreated(contractId, client, freelancer, amount)
ContractFunded(contractId, totalAmount)
MilestoneSubmitted(contractId, milestoneIndex, proofHash)
MilestoneApproved(contractId, milestoneIndex, amountReleased)
MilestoneRejected(contractId, milestoneIndex, reason)
DisputeRaised(contractId, raisedBy, reason)
DisputeResolved(contractId, resolution, toFreelancer)
ContractCancelled(contractId, cancelledBy)
ContractCompleted(contractId)
```

### Event Listener

```python
# backend/app/services/event_listener.py
# Background task polling every 10 seconds
# Listens for: MilestoneApproved, DisputeRaised, DisputeResolved
# On MilestoneApproved → update milestone status + contract funded amount in DB
# On DisputeRaised → create dispute record, update contract status
# On DisputeResolved → update dispute resolution, contract status
```

---

## Design Patterns

### 1. Service Layer Pattern

Routes (routers/) delegate to services (services/):
```python
# routers/contract.py
@router.post("/{id}/fund")
async def fund_contract(...):
    result = await contract_service.fund_contract(...)
    return result
```

**Services used in the codebase**:
- `auth_service.py` — password hashing, JWT management, challenge verification
- `blockchain_service.py` — Web3 contract ABI, transaction building/signing
- `ipfs_service.py` — file upload/download to IPFS daemon
- `contract_service.py` — contract creation, funding orchestration
- `recommendation_service.py` — skill-matching algorithm for job recommendations
- `event_listener.py` — blockchain event polling
- `repin_service.py` — periodic IPFS pin refresh

### 2. Dependency Injection (FastAPI)

```python
# middleware/auth.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    ...
    return user

# Used in routes
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return user
```

### 3. Repository-ish Pattern

Models include query helpers:
```python
# models/contract.py
class Contract(Base):
    @classmethod
    async def get_by_id(cls, db, id):
        return await db.get(cls, id)
```

### 4. Dependency Inversion for Tests

Web3 client injected via config:
```python
# services/blockchain_service.py
class BlockchainService:
    def __init__(self, w3: Web3 = None):
        self.w3 = w3 or self._init_web3()
```

This allows mocks in tests:
```python
# tests/backend/test_blockchain.py
mock_w3 = MagicMock(spec=Web3)
service = BlockchainService(w3=mock_w3)
```

---

## Key Configuration

### Environment Variables (backend/.env)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@localhost:5432/freeledger` | PostgreSQL async connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `IPFS_URL` | `http://localhost:5001` | IPFS API endpoint |
| `JWT_SECRET` | (required) | Secret key for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `WEB3_PROVIDER_URL` | `http://localhost:8545` | Ethereum node RPC URL |
| `CONTRACT_ADDRESS` | (set at deploy) | Deployed GigEscrow address |
| `CONTRACT_OWNER_KEY` | (required) | Private key for admin operations |
| `ENCRYPTION_KEY` | (required) | Key for sensitive data encryption |

### Ports

| Port | Service |
|---|---|
| 3000 | Frontend (React dev server) |
| 3001 | Backend (FastAPI) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 5001 | IPFS API |
| 8080 | IPFS Gateway |
| 8545 | Hardhat (Ethereum node) |

---

## Frontend Architecture

### State Management

- **AuthContext**: JWT tokens, user profile, login/logout functions
- **Web3Context**: MetaMask provider, signer, account, chain ID, connection functions
- **Component-local state**: Individual page state via `useState`/`useEffect`

### API Communication

- **Axios instance** (`services/api.js`): Base URL, JWT interceptor, 401 handler
- **Custom hooks** (`hooks/useApi.js`): Generic fetch with loading/error states

### Routing

```
/                   → LandingPage
/login              → Login (wallet + email)
/dashboard          → Dashboard (Client or Freelancer)
/find-jobs          → FindJobs (job marketplace)
/job/:id            → JobDetail
/proposals/:jobId   → ProposalList
/contract/:id       → ContractDetail
/milestone/:id      → MilestoneDetail
/messages           → Messages
/profile            → Profile
/admin              → AdminPanel
```

### Auth Guard

```javascript
// components/ProtectedRoute.js
// Redirects to /login if no token in AuthContext
// Used to wrap all authenticated routes
```

---

## Caching Strategy

### Redis Cache

| Key Pattern | TTL | Purpose |
|---|---|---|
| `nonce:{address}` | 5 min | Signing challenge |
| `user:{id}` | 15 min | User profile |
| `admin:stats` | 5 min | Admin dashboard stats |
| `blacklist:{token}` | Token expiry | Invalidated tokens |

### Cache Invalidation

- On user update → delete `user:{id}`
- On job create/update → no cache (list queries not cached)
- On admin action → delete `admin:stats`

---

## Error Handling

### Backend Exception Hierarchy

```python
# utils/exceptions.py
class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class NotFoundException(AppException):  # 404
class UnauthorizedException(AppException):  # 401
class ForbiddenException(AppException):  # 403
class ConflictException(AppException):  # 409
```

### Global Exception Handler

Registered in `main.py`:
```python
@app.exception_handler(AppException)
async def app_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
```

---

## Testing Architecture

### Backend Tests

**Directory**: `tests/backend/`

| File | Count | Framework | What it Tests |
|---|---|---|---|
| `test_auth.py` | 4 | pytest | Health check, challenge retrieval, wallet validation, login without challenge |
| `test_ipfs.py` | 2 | pytest | Empty upload handling, invalid CID rejection |
| `test_blockchain.py` | 7 | pytest | All blockchain service methods (fund, submit, approve, reject, dispute, resolve, cancel) |
| `test_integration.py` | 2 | pytest | Full contract lifecycle, dispute lifecycle |

**Pattern**: Mocks for Web3, async SQLAlchemy, Redis, IPFS

### Smart Contract Tests

**Directory**: `contracts/test/`
- Hardhat (Mocha/Chai)
- Test coverage: contract creation, funding, milestone lifecycle, disputes

### Missing Tests

- **Frontend**: Zero tests (no jest/React Testing Library setup)
- **Backend**: No tests for: `contract_service.py`, `recommendation_service.py`, messaging endpoints, proposal router, admin router
- **Integration**: Tests exist but limited in scope

---

## Docker Setup

### docker-compose.yml

```yaml
services:
  postgres:       # PostgreSQL 15
  redis:          # Redis 7
  hardhat:        # Hardhat node (local Ethereum)
  ipfs:           # IPFS Kubo v0.28.0
```

**Note**: Frontend service NOT included in docker-compose. Frontend runs separately via `npm start`.

### Dockerfile

- Backend Dockerfile exists at `docker/Dockerfile`
- Frontend Dockerfile does NOT exist
- Multi-service orchestration through docker-compose

---

## Known Technical Debt

| Area | Issue | Severity |
|---|---|---|
| **Database** | Schema uses `create_all()` instead of migrations | Medium |
| **Database** | `schema.sql` enums mismatch Python models (case differences) | Low |
| **Security** | Wallet address stored in DB (architecturally required — auth lookup, on-chain ops) | Documentation corrected |
| **Security** | Single private key used for all on-chain operations | High |
| **API** | No error codes in error responses | Medium |
| **API** | Job search filter (`?q=`) only client-side | Low |
| **Web3** | `contract_service.py` uses deprecated `datetime.utcnow()` | Low |
| **Code** | `bijee_frontend/` removed in Queue-15 (redundant demo frontend) | Resolved |
| **Testing** | No frontend tests | High |
| **Testing** | Missing backend unit tests for critical services | High |
| **DevOps** | No frontend Dockerfile | Medium |
| **DevOps** | Frontend not in docker-compose | Medium |

---

## Environment Requirements

### Production Deployment Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `CONTRACT_OWNER_KEY` to a secure wallet (non-test)
- [ ] Set `ENCRYPTION_KEY` to a strong random value
- [ ] Use a real Ethereum RPC provider (Infura/Alchemy), not Hardhat
- [ ] Set up PostgreSQL with persistent volume
- [ ] Set up Redis with persistence
- [ ] Deploy IPFS with proper storage configuration
- [ ] Deploy smart contract to real network
- [ ] Create frontend Dockerfile and add to docker-compose
- [ ] Set up HTTPS termination (reverse proxy)
- [ ] Configure proper CORS origins (not `*`)
- [ ] Set up monitoring and logging
- [ ] Run security audit
- [ ] Add proper error codes to all responses

---

## Development Guidelines

### Adding a New Feature

1. Define Pydantic schemas in `schemas/`
2. Add route handler in `routers/`
3. Implement business logic in `services/`
4. Add SQLAlchemy model if new table needed
5. Add frontend page/component
6. Update API spec in `docs/architecture/api-spec.md`
7. Add tests in `tests/`

### Code Conventions

- **Python**: snake_case, type hints, async/await, descriptive function names
- **JavaScript**: camelCase, React functional components with hooks
- **Solidity**: CamelCase, natspec comments, reentrancy guard on payable functions
- **Imports**: Absolute imports in backend (`app.models.user`), relative in frontend (`../hooks/useAuth`)

### Running the Stack

```bash
# Infrastructure
docker compose -f docker/docker-compose.yml up -d

# Backend (terminal 1)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload

# Frontend (terminal 2)
cd frontend && npm start

# Smart contract (terminal 3, after first compose)
cd contracts && npx hardhat run scripts/deploy.js --network localhost

# Tests
cd backend && pytest -v
cd contracts && npx hardhat test
```
