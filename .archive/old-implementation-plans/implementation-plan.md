# Implementation Plan

> Based on: `.wip/backlog/tasks.md`, `REQUIREMENTS_AUDIT.md`, `GAP_ANALYSIS.md`, `CAPSTONE_REVIEW.md`
> Estimated total effort: 14–17 days (single developer)

---

## Phase 1: Documentation Integrity & Security (Priority Blockers)

**Goal**: Fix all documentation contradictions and critical security issues before any feature work.

| Task | ID | Effort | Why Phase 1 |
|---|---|---|---|
| Fix wallet address privacy | T-001 | 2 days | Academic dishonesty if uncorrected; critical contradiction |
| Fix migration strategy | T-002 | 4 hours | Sprint plan claim is false; needs correction |
| Fix schema enum mismatch | T-003 | 1 hour | SQL docs incompatible with code |
| Fix private key single point of failure | T-012 | 1 day | Security risk; needs documentation + multi-key |

**Total Phase 1**: ~3.5 days

---

## Phase 2: User-Facing Fixes

**Goal**: Fix bugs and missing features that directly affect user experience.

| Task | ID | Effort | Why Phase 2 |
|---|---|---|---|
| Add server-side job search | T-007 | 2 hours | Search doesn't work at scale |
| Fix admin messages tab | T-015 | 30 min | Admin panel has buggy tab |
| Align schema tables with models | T-013 | 2 hours | Schema drift |

**Total Phase 2**: ~5 hours

---

## Phase 3: Non-Functional Requirements & Infrastructure

**Goal**: Containerization, API hardening, code cleanup.

| Task | ID | Effort | Why Phase 3 |
|---|---|---|---|
| Create frontend Dockerfile | T-006 | 1 day | Incomplete containerization |
| Add error codes to API | T-008 | 3 hours | API response contract |
| Add blockchain call timeouts | T-016 | 4 hours | Reliability |
| Clean up redundant frontend trees | T-009 | 1 day | Maintainability |

**Total Phase 3**: ~3 days

---

## Phase 4: Testing

**Goal**: Comprehensive test suite for both frontend and backend.

| Task | ID | Effort | Why Phase 4 |
|---|---|---|---|
| Add frontend component tests | T-004 | 1.5 days | Zero frontend tests |
| Add missing backend tests | T-005 | 3 days | Critical business logic untested |

**Total Phase 4**: ~4.5 days

---

## Phase 5: Technical Debt Cleanup

**Goal**: Fix low-severity issues, deprecated APIs, env documentation.

| Task | ID | Effort | Why Phase 5 |
|---|---|---|---|
| Fix deprecated `utcnow()` | T-014 | 30 min | Python 3.12 deprecation |
| Add `.env.example` documentation | T-017 | 1 hour | Dev onboarding |

**Total Phase 5**: ~1.5 hours

---

## Phase 6: Stretch Features

**Goal**: Enhancements that improve UX but aren't blockers for capstone submission.

| Task | ID | Effort | Why Phase 6 |
|---|---|---|---|
| Real-time messaging | T-010 | 2 days | Nice-to-have UX improvement |
| Notifications system | T-011 | 2 days | Nice-to-have UX improvement |

**Total Phase 6**: ~4 days

---

## Phase 7: Final Verification

**Goal**: Ensure everything works together and documentation reflects reality.

| Task | ID | Effort |
|---|---|---|
| Update sprint plan documentation | T-018 | 2 hours |
| Run full test suite | — | 1 hour |
| Run linter/typecheck | — | 30 min |
| Final documentation sweep | — | 2 hours |

**Total Phase 7**: ~5.5 hours

---

## Ordering Rationale

1. **Phase 1 first** — Documentation contradiction (T-001) is the most serious issue for an academic project. The security risk (T-012) needs visibility before any code changes.
2. **Phase 2 next** — User-facing bugs (T-007, T-015) have direct impact.
3. **Phase 3 follows** — Infrastructure and API hardening before testing.
4. **Phase 4 after infrastructure** — Tests are most valuable after fixing code quality issues.
5. **Phase 5 any time** — Low-risk cleanup.
6. **Phase 6 last** — Stretch features; skip if time is tight.
7. **Phase 7 final** — Verification and documentation sync.

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Phase 1 (T-001) breaks wallet auth | High | Medium | Write tests before changing auth flow |
| Phase 4 testing reveals bugs | High | High | Accept — better to find them now |
| Phase 6 exceeds time budget | Low | Medium | Mark as stretch; skip if needed |
| Frontend refactor (T-009) breaks UI | Medium | Low | Keep backup, test thoroughly |
