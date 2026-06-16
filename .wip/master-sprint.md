# Master Sprint — FreeLedger

> Current active sprint and remaining work plan
> Sprint Start: June 16, 2026 | Duration: 3-4 days (Sprint 1)
> Source: `.wip/master-backlog.md`, `.wip/master-requirements.md`

---

## Sprint 1: Documentation Integrity & Critical Security

**Goal**: Resolve all documentation contradictions and critical security issues before any feature work.

### Tasks

| Order | ID | Task | Effort | Requirement Links |
|---|---|---|---|---|
| 1 | MB-003 | Fix schema enum mismatch | 1 hour | CAP-01, GAP-03 |
| 2 | MB-008 | Align schema tables with models | 2 hours | CAP-01, GAP-13 |
| 3 | MB-002 | Fix database migration strategy | 4 hours | CAP-01, NFR-13, GAP-02 |
| 4 | MB-006 | Fix private key security (documentation + mitigation) | 1 day | SEC-06, NFR-14, GAP-12 |
| 5 | MB-001 | Fix wallet address privacy | 1-2 days | NFR-11, SEC-05, CAP-01, GAP-01 |
| 6 | MB-007 | Update sprint plan documentation | 2 hours | CAP-01 |

### Success Criteria
- [ ] No documentation contradictions remain (4 resolved)
- [ ] Schema SQL matches Python models exactly
- [ ] Database migration strategy is honest and functional
- [ ] Private key risk is documented with mitigation path
- [ ] Sprint plan truthfully reflects project status
- [ ] All existing tests pass

---

## Sprint 2: User-Facing Fixes & Infrastructure

**Goal**: Fix bugs, add missing search, containerize frontend.

| Order | ID | Task | Effort | Requirement Links |
|---|---|---|---|---|
| 1 | MB-013 | Fix admin messages tab | 30 min | UI-04, GAP-15 |
| 2 | MB-010 | Add server-side job search | 2 hours | FR-05, GAP-07 |
| 3 | MB-014 | Add blockchain call timeouts | 4 hours | NFR-08 |
| 4 | MB-011 | Add error codes to API | 3 hours | NFR-09, GAP-08 |
| 5 | MB-012 | Clean up redundant frontend trees | 1 day | GAP-09 |
| 6 | MB-009 | Create frontend Dockerfile | 1 day | CAP-03, GAP-06 |
| 7 | MB-021 | Fix deprecated utcnow() | 30 min | GAP-14 |
| 8 | MB-022 | Add .env.example documentation | 1 hour | — |

---

## Sprint 3: Testing Core

**Goal**: Comprehensive test suite for backend and frontend.

| Order | ID | Task | Effort | Requirement Links |
|---|---|---|---|---|
| 1 | MB-005 | Add missing backend service tests | 3 days | NFR-16, CAP-02 |
| 2 | MB-004 | Add frontend component tests | 1.5 days | NFR-15, CAP-02 |
| 3 | MB-028 | Smart contract edge case tests | 0.5 day | TEST-11 |
| 4 | MB-025 | API response time monitoring | 0.5 day | TEST-13 |
| 5 | MB-026 | IPFS availability monitoring | 0.5 day | TEST-14 |
| 6 | MB-027 | Event listener health monitoring | 0.5 day | TEST-15 |
| 7 | MB-029 | JWT secret rotation support | 0.5 day | SEC-01 (enhancement) |

---

## Sprint 4: Freelancer Discovery Features

**Goal**: Implement the freelancer directory and enhanced discovery.

| Order | ID | Task | Effort | Requirement Links |
|---|---|---|---|---|
| 1 | MB-017 | Add user model fields | 0.5 day | FR-19 |
| 2 | MB-015 | Freelancer directory backend | 1 day | FR-20 |
| 3 | MB-016 | Freelancer directory frontend | 1.5 days | FR-21, FR-22, UI-06 |
| 4 | MB-018 | People you may know endpoint | 0.5 day | FR-23 |
| 5 | MB-019 | Proposal-to-message auto-thread | 0.5 day | UI-08 |
| 6 | MB-020 | Enhanced chat UI | 1 day | UI-07 |

---

## Sprint 5: Stretch Features & Polish

**Goal**: Real-time messaging, notifications, deployment guide.

| Order | ID | Task | Effort | Requirement Links |
|---|---|---|---|---|
| 1 | MB-023 | Real-time messaging (WebSocket/SSE) | 2 days | GAP-10 |
| 2 | MB-024 | Notifications system | 2 days | GAP-11, UI-09 |
| 3 | MB-030 | Deployment guide | 1 day | CAP-03 |

---

## Remaining Work After All Sprints

**Total estimated effort**: ~20-22 developer-days across 5 sprints

| Sprint | Focus | Effort |
|---|---|---|
| Sprint 1 | Documentation Integrity & Critical Security | 3-4 days |
| Sprint 2 | User-Facing Fixes & Infrastructure | ~3 days |
| Sprint 3 | Testing Core | ~6.5 days |
| Sprint 4 | Freelancer Discovery Features | ~5 days |
| Sprint 5 | Stretch Features & Polish | ~5 days |

---

## Recommended Immediate Implementation Order

The first code changes should be (in order):

1. **MB-003**: `schema.sql` enum alignment (1 hour, no risk)
2. **MB-013**: Fix admin messages tab (30 min, trivial bug fix)
3. **MB-021**: Fix deprecated `utcnow()` (30 min, trivial)
4. **MB-010**: Add server-side job search (2 hours, straightforward)
5. **MB-002**: Fix migration strategy (4 hours, moderate)
6. **MB-014**: Add blockchain call timeouts (4 hours, moderate)
7. **MB-011**: Add error codes to API (3 hours, moderate)
8. **MB-008**: Align schema tables with models (2 hours, straightforward)
9. **MB-006**: Fix private key documentation (1 day)
10. **MB-001**: Fix wallet address privacy (1-2 days, most complex)
