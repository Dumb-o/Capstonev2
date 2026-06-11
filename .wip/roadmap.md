# FreeLedger — Comprehensive Improvement Roadmap

**Last Updated**: June 11, 2026

---

## 1. Current System Assessment

**Platform**: Hybrid Web3 freelancing marketplace (~90% functional)
**Architecture**: React 18 frontend -> FastAPI backend -> PostgreSQL + Redis + IPFS + Hardhat (Ethereum)
**Auth**: Dual MetaMask (ECDSA) + email/password with JWT
**Smart Contract**: `GigEscrow.sol` — 300 lines, 24 passing tests, deployed at `0x5FbDB2...`

### What Works Well

- Full backend API — 40+ endpoints, all routes functional, all on-chain ops wired
- Smart contract escrow with complete state machine (Created -> InProgress -> Completed/Disputed/Cancelled)
- IPFS storage verified end-to-end
- Blockchain event listener (5s polling, Redis crash recovery)
- Role-based routing (client/freelancer/admin) with dedicated dashboards
- Full proposal system (submit, accept/reject) with ProposalForm component
- Admin panel with 7 tabs (dashboard, users, jobs, proposals, contracts, disputes, messages)
- Two parallel component trees exist (primary React SPA + static HTML/CSS by Bijee)
- MetaMask login with role selection and role update for existing users

### Functional Requirements Coverage

| Area | Status |
|---|---|
| IPFS Storage (FR-1) | ✅ Verified end-to-end |
| Smart Contract Escrow (FR-2) | ✅ 24 tests, all on-chain ops |
| Wallet Identity (FR-3) | ✅ MetaMask + ECDSA + email fallback |
| Hybrid Architecture (FR-4) | ✅ PostgreSQL + blockchain |
| Rule-Based Matching (FR-5) | ❌ Not implemented |
| Performance Validation (FR-6) | ❌ Not implemented |
| Cryptographic Deliverables (FR-7) | ✅ CID linked to state |
| Contract State Transitions (FR-8) | ✅ State machine + event listener |
| Proposal System (FR-9) | ✅ Backend + ProposalForm UI |
| Job CRUD (FR-10) | ✅ Full CRUD + search + filter |
| Contract Lifecycle (FR-11) | ✅ Create -> sign -> fund -> active -> complete |
| Milestone Workflow (FR-12) | ✅ Submit -> approve/reject -> on-chain pay |
| Dispute Management (FR-13) | ✅ Raise + admin resolve + event sync |
| Messaging (FR-14) | ✅ Conversations + send + read |
| User Profiles (FR-15) | ✅ Edit bio, skills, rate, avatar |
| Admin Panel (FR-16) | ✅ 7-tab UI, full CRUD |
| IPFS Upload/Download (FR-17) | ✅ Verified end-to-end |
| Blockchain Event Listener (FR-18) | ✅ Background async worker |

---

## 2. Known Issues & Technical Debt

| # | Issue | Severity | Location |
|---|---|---|---|
| I1 | Auth page has demo credentials + poor UX | Medium | `Login.js` — demo fill shows hardcoded creds |
| I2 | ExploreJobs search is client-side only | Medium | `ExploreJobs.js` — no `?q` API param |
| I3 | No "Raise Dispute" button on contract detail | Medium | `ContractDetailPage.js` — dispute shown read-only |
| I4 | No real-time messaging (REST polling only) | Medium | `Messages.js` — no WebSocket/SSE |
| I5 | Proposal acceptance doesn't auto-create contract | Medium | Need to manually go to CreateContract |
| I6 | Freelancer discovery/directory is basic | Medium | `FreelancerDirectory.js` exists but filtering limited |
| I7 | No notifications system | Medium | No model, no endpoint, no UI |
| I8 | Two parallel component trees | Low | Unused legacy components in `components/Auth/`, `components/Landing/` |
| I9 | UI inconsistent with Bijee's design system | Medium | Main SPA doesn't fully use `bijee_frontend/` patterns |
| I10 | CORS allows all origins (`*`) | Medium | `main.py:37` — `allow_origins=["*"]` |
| I11 | `schema.sql` and SQLAlchemy models diverged | Low | Enum values don't match between files |
| I12 | PlantUML diagrams have stale state names | Low | `05_State_Machine.puml` doesn't match actual `ContractStatus` enum |

---

## 3. Recommended Architecture Changes

### 3.1 Component Tree Cleanup
- Remove unused parallel trees: `components/Auth/`, `components/Landing/`, `components/Client/`, `components/Freelancer/`, `components/pages/`
- Keep only the active set referenced by `App.js`
- Archive `bijee_frontend/` static files after design unification

### 3.2 Design System Unification
- Promote `styles.css` + `freeledger.css` into a unified Bijee design system
- Standardize: Sora font, `--blue` accent, `--radius` system, stat-card/modal/toast patterns
- Extract CSS patterns from `bijee_frontend/client/` and `bijee_frontend/freelancer/`

### 3.3 State Management Enhancement
- Augment `AppContext.js` to include: freelancers, messages, notifications, proposals
- Add dedicated context slices for `ContractsContext`, `MessagesContext`, `JobsContext`

### 3.4 Real-Time Communications
- Add WebSocket support for messaging (Redis pub/sub or Socket.IO)
- Alternative: SSE or enhanced polling for MVP

---

## 4. Dashboard Enhancement Roadmap

### 4.1 Freelancer Dashboard
Using `bijee_frontend/freelancer/dashboard.html` as primary reference:

| Section | Data Source | Status |
|---|---|---|
| Stats Bar | `GET /contracts?role=freelancer` + `GET /proposals/mine` | ✅ Done |
| Active Contracts | `GET /contracts?role=freelancer&status=active` | ✅ Done |
| My Proposals | `GET /proposals/mine` | ✅ Done |
| Recommended Jobs | `GET /jobs?status=open&limit=5` | ✅ Done |
| Earnings Overview | Computed from approved milestones | ✅ Done |
| Profile & Skill Match | `GET /users/me` | ✅ Done |
| Recent Messages | `GET /messages/conversations` (last 3) | ⚠️ Not shown |

### 4.2 Client Dashboard
Using `bijee_frontend/client/dashboard.html`:

| Section | Data Source | Status |
|---|---|---|
| Stats Bar | `GET /contracts?role=client` + `GET /jobs` | ✅ Done |
| Open Jobs | `GET /jobs?status=open` | ✅ Done |
| Pending Proposals | `GET /proposals/received` | ✅ Done |
| Active Contracts | `GET /contracts?status=active` | ✅ Done |
| Freelancer Discovery | `GET /users?role=freelancer` | 🆕 Can be added |
| Hiring Pipeline | Multi-stage tracking | 🆕 Future |
| Spending Overview | Aggregate from contracts | ✅ Done |

---

## 5. Messaging Redesign Plan

### 5.1 People You May Know
- Endpoint exists: `GET /api/recommendations/people`
- Matches by overlapping skills, returns freelancers
- Not yet wired into the Messages UI

### 5.2 Enhanced Messaging UI
Using Bijee's `client/messages.css` and `freelancer/messages.html` patterns:
- Conversation previews with timestamps — ✅ Done
- Unread indicators — ✅ Done
- Search in conversations — 🆕 Future
- Typing indicators — 🆕 Future
- Message attachments via IPFS — 🆕 Future

### 5.3 Proposal-to-Messaging Integration
- Auto-create conversation when proposal submitted — 🆕 Planned
- System message: "[Freelancer Name] submitted a proposal for [Job Title]"
- Client can View/Approve/Reject/Reply from message thread

---

## 6. Proposal-to-Contract Auto-Creation

**New flow** (fully implemented):
1. Freelancer visits job detail -> clicks "Apply Now" ✅
2. ProposalForm modal: cover letter, bid amount, estimated days ✅
3. `POST /jobs/{id}/proposals` -> proposal created ✅
4. Proposal appears in Freelancer Dashboard (My Proposals) ✅
5. Proposal appears in Client Dashboard (Proposals Received) ✅
6. Client Accepts/Rejects -> status updated ✅
7. **Missing**: Acceptance should auto-create a contract with single milestone

**Work to be done**:
- On proposal acceptance -> auto-generate contract with job/proposal data, single milestone
- Status: `pending_review` (needs both parties to review terms)
- Notify both parties with terms reference

---

## 7. Remaining Implementation Phases

### Phase 1: Testing Foundation (Days 1-7)
**Goal**: Achieve >80% test coverage on all backend services and core frontend components.

| Week | Tasks |
|---|---|
| **Day 1-2** | Contract service tests: create, sign, fund, milestone submit/approve/reject |
| **Day 3** | Dispute + admin tests, messaging tests, proposal tests |
| **Day 4** | Auth edge cases (expired tokens, invalid sigs, duplicate wallet) |
| **Day 5** | Integration tests: full contract lifecycle + dispute lifecycle |
| **Day 6** | Frontend tests: ProposalForm, dashboards, ContractDetailPage |
| **Day 7** | Contract edge-case tests, test coverage report |

### Phase 2: UX Polish (Days 8-14)
**Goal**: Close all critical UX gaps identified in audit.

| Day | Tasks |
|---|---|
| **Day 8** | Server-side ExploreJobs search (`?q=` API param) |
| **Day 9** | "Raise Dispute" button + modal on ContractDetailPage |
| **Day 10** | Proposal acceptance -> auto-create contract |
| **Day 11** | Clean up unused component trees, archive bijee_frontend |
| **Day 12** | Design system unification: port Bijee CSS patterns into main styles |
| **Day 13** | Notifications model + endpoint + bell icon badge |
| **Day 14** | Notifications UI: dropdown list, mark-as-read |

### Phase 3: Security & Infrastructure (Days 15-19)
**Goal**: Production-ready security posture and containerized deployment.

| Day | Tasks |
|---|---|
| **Day 15** | Redis-backed rate limiting middleware |
| **Day 16** | CORS hardening, input sanitization |
| **Day 17** | Dockerize backend + frontend |
| **Day 18** | Environment-agnostic config (dev/staging/prod) |
| **Day 19** | Deployment guide, JWT key rotation support |

### Phase 4: Real-Time & Monitoring (Days 20-23)
**Goal**: Real-time messaging, performance baselines, monitoring.

| Day | Tasks |
|---|---|
| **Day 20** | WebSocket backend setup (Redis pub/sub) |
| **Day 21** | WebSocket frontend integration + auto-refresh |
| **Day 22** | Load testing (k6/locust), API monitoring middleware |
| **Day 23** | IPFS + event listener health checks, final review |

### Phase 5: Final Polish & Documentation (Days 24-25)
**Goal**: Deliverable-ready project with comprehensive docs.

| Day | Tasks |
|---|---|
| **Day 24** | Bug bash, fix outstanding issues |
| **Day 25** | Update diagrams to match implementation, final testing pass |

---

## 8. Database/Model Changes Needed

| Change | Reason | Status |
|---|---|---|
| `notifications` table (user_id, type, title, message, read, related_id) | Missing feature | 🆕 Planned |
| `freelancer_ratings` table (contract_id, rater_id, ratee_id, rating, review) | Future feature | 🆕 Low priority |
| Add `milestones`, `deliverables`, `acceptance_criteria`, `roadmap` JSONB fields to `jobs` | Rich job descriptions | 🆕 Planned |
| Add `message_thread_id` FK to `proposals` | Proposal-to-messaging integration | 🆕 Planned |
| Sync `schema.sql` with SQLAlchemy `models.py` | Technical debt | 🆕 Needed |

---

## 9. Order of Execution (Gantt Summary)

```
Phase 1: Testing
  │████████████████████████░░░░░░░░░░░░░░░░░
  │
Phase 2: UX Polish
  │░░░░░░░░░░░░░░████████████████████░░░░░░░░
  │
Phase 3: Security & Infra
  │░░░░░░░░░░░░░░░░░░░░░░░░░░█████████████░░░
  │
Phase 4: Real-Time & Monitoring
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
  │
Phase 5: Final Polish
  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████
  │
  Week 1    Week 2    Week 3    Week 4    Week 5
```

---

## 10. Risks and Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Bijee patterns may not fully React-ify | Medium | Extract CSS; HTML maps well to JSX |
| Two component trees cause confusion | Medium | Remove unused trees first in Phase 2 |
| Blockchain ops require Hardhat node running | High | Check `docker ps`; document in setup guide |
| No existing frontend tests | Medium | Manual QA + React Testing Library |
| No real-time messaging | Medium | Start with polling; add WebSocket later |
| Private key management is single point of failure | High | Document production key management separately |
