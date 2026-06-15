# FreeLedger — Non-Functional Requirements

Extracted from Proposal, Sprint Plans, and Architecture docs.

---

## NFR-1: Performance — Latency < 1.5s
- **Description**: System operations should respond within 1.5 seconds
- **Status**: ❌ **Not Tested / Not Verified**
- No performance benchmarks exist
- API endpoints have no timeout or latency monitoring

---

## NFR-2: Availability — Storage > 95%
- **Description**: IPFS storage availability should exceed 95%
- **Status**: ❌ **Not Tested / Not Verified**
- No uptime/availability monitoring for IPFS or backend

---

## NFR-3: Security — Wallet-Based Auth
- **Description**: ECDSA signature recovery for authentication; wallet addresses never stored in DB
- **Status**: ✅ **Implemented**
- JWT contains pseudonymous user ID; wallet address recovered from signature each login
- Address held in-memory only during request

---

## NFR-4: Privacy — Pseudonymous IDs
- **Description**: User IDs are pseudonymous (e.g., "usr_abc123"); wallet addresses NEVER in PostgreSQL
- **Status**: ✅ **Implemented**
- Address stored in Redis (1h TTL) only; DB uses pseudonymous IDs

---

## NFR-5: Scalability — Hybrid Architecture
- **Description**: Off-chain PostgreSQL for low-latency operations; on-chain only for trust-sensitive actions
- **Status**: ✅ **Architecture Implemented**
- Read/search operations go through PostgreSQL; only escrow/payment logic on-chain
- On-chain calls fully wired via `CLIENT_PRIVATE_KEY` env var (June 4 session)

---

## NFR-6: Security — Rate Limiting
- **Description**: Redis-backed rate limiting middleware to prevent abuse
- **Status**: ❌ **Not Implemented**
- Listed in Sprint 5 but no code exists

---

## NFR-7: Security — Input Validation
- **Description**: Validate all API inputs using Pydantic schemas
- **Status**: ✅ **Implemented**
- All endpoints use Pydantic request models with validation

---

## NFR-8: Reliability — Automated Testing
- **Description**: Unit + integration tests for all components
- **Status**: ⚠️ **Partially Implemented**
- **Smart Contract**: 24 tests (comprehensive)
- **Backend**: 6 tests (auth + IPFS stubs only)
- **Frontend**: ❌ 0 tests
- **Integration**: ❌ 0 tests

---

## NFR-9: Maintainability — API Documentation
- **Description**: Auto-generated OpenAPI docs via FastAPI
- **Status**: ✅ **Implemented**
- Available at `http://localhost:8000/docs`

---

## NFR-10: Security — CORS Hardening
- **Description**: Proper CORS configuration for production
- **Status**: ⚠️ **Partially Implemented**
- Basic CORS exists but no hardening for production

---

## NFR-11: DevOps — Environment-Agnostic Config
- **Description**: Dev/staging/prod configuration support
- **Status**: ❌ **Not Implemented**
- Single `.env` file; no environment separation

---

## NFR-12: Infrastructure — Dockerized Services
- **Description**: All services containerized for consistent deployment
- **Status**: ⚠️ **Partially Implemented**
- Infra services (PG, Redis, IPFS, Hardhat) are Dockerized
- Backend and frontend run locally, not in containers

---

## NFR-13: Security — Private Key Management
- **Description**: Secure handling of blockchain private keys
- **Status**: ⚠️ **Partially Implemented**
- Private key moved from hardcoded empty string to `CLIENT_PRIVATE_KEY` environment variable
- Uses Hardhat test account key by default; production should use a secure vault/HSM

---

## NFR-14: Reliability — Blockchain Event Synchronization
- **Description**: Background event listener keeps DB in sync with blockchain state
- **Status**: ✅ **Implemented**
- Async background worker polls `MilestoneApproved`, `DisputeRaised`, `DisputeResolved` events every 5 seconds
- Last processed block tracked in Redis for crash recovery
