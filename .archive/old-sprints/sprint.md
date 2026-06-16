# Active Sprint

> Sprint Start: June 16, 2026
> Duration: 3–4 days

---

## Goal

Fix all documentation contradictions and critical security issues blocking accurate academic submission.

This sprint selects the highest-priority, most impactful work from Phase 1 of the implementation plan. These tasks resolve the most serious issues identified in the audit: false documentation claims, security risks, and schema misalignment.

---

## Sprint Tasks

### Task 1: Fix Wallet Address Privacy (T-001)

| Field | Value |
|---|---|
| **Priority** | P0 - Critical |
| **Effort** | 1-2 days |
| **Owner** | TBD |

**Subtasks:**
1. Decide approach: (a) hash wallet addresses before storage, or (b) update documentation
2. If (a): Add `wallet_address_hash` column, hash on user creation/login, remove raw `wallet_address` from User model
3. Update auth flow: verify signature against provided address, then store only hash
4. Update `data-flow.md` privacy architecture section
5. Verify login flow still works end-to-end
6. Run all existing tests

**Acceptance Criteria:**
- Wallet addresses are not stored in plaintext (if option a)
- OR documentation accurately describes actual storage (if option b)
- MetaMask login still works
- All existing tests pass

---

### Task 2: Fix Database Migration Strategy (T-002)

| Field | Value |
|---|---|
| **Priority** | P1 - High |
| **Effort** | 4 hours |
| **Owner** | TBD |

**Subtasks:**
1. Decide approach: (a) implement Alembic on startup, or (b) document `create_all()` as intentional
2. If (a): Remove `Base.metadata.create_all()`, configure Alembic to run `upgrade head` on startup
3. Verify existing Alembic migrations are valid
4. Add migration for any missing tables
5. Update sprint plan documentation

**Acceptance Criteria:**
- Startup uses proper migrations or explicitly documents otherwise
- All tables created correctly
- Sprint plan matches reality

---

### Task 3: Align Schema Enums with Models (T-003)

| Field | Value |
|---|---|
| **Priority** | P1 - High |
| **Effort** | 1 hour |
| **Owner** | TBD |

**Subtasks:**
1. Compare all enum values in `database/schema.sql` vs `backend/app/models/models.py`
2. Update `schema.sql` to match Python models exactly
3. Verify all enum values present

**Acceptance Criteria:**
- All SQL enum definitions match Python enum definitions (casing, values)
- No enum value mismatches

---

### Task 4: Fix Private Key Security (T-012)

| Field | Value |
|---|---|
| **Priority** | P1 - High |
| **Effort** | 1 day |
| **Owner** | TBD |

**Subtasks:**
1. Document risk prominently in `docs/` (production readiness guide)
2. Add per-user key derivation support (or document external signer path)
3. Add `client_private_key` env var validation on startup
4. Warn if default/test key is detected in production mode

**Acceptance Criteria:**
- Risk documented clearly
- Startup validates key presence
- No regression in blockchain operations

---

### Task 5: Update Sprint Plan Documentation (T-018)

| Field | Value |
|---|---|
| **Priority** | P1 - High |
| **Effort** | 2 hours |
| **Owner** | TBD |

**Subtasks:**
1. Review all completion claims in `docs/plans/sprint-plans.md`
2. Correct false claims (Alembic, testing, wallet privacy)
3. Add accurate status for remaining work
4. Link to `.wip/backlog/tasks.md` for traceability

**Acceptance Criteria:**
- Sprint plan accurately reflects actual implementation status
- False claims corrected
- Links to backlog tasks for remaining work

---

## Success Criteria

At sprint end:
1. [ ] All critical (P0) documentation contradictions are resolved
2. [ ] All high-priority (P1) schema/migration issues are fixed
3. [ ] Private key risk is documented and mitigated
4. [ ] Sprint plan truthfully reflects project status
5. [ ] All existing tests still pass

---

## Estimated Completion Order

| Order | Task | Effort |
|---|---|---|
| 1st | T-003: Schema enum alignment | 1 hour |
| 2nd | T-002: Migration strategy | 4 hours |
| 3rd | T-012: Private key documentation | 1 day |
| 4th | T-001: Wallet privacy fix | 1-2 days |
| 5th | T-018: Update sprint plan | 2 hours |

T-003 first because it's the fastest win. T-001 last because it's the most complex and requires careful testing.

---

## Blockers

- T-001 requires a team decision: hash addresses or update docs? Needs supervisor input.
- T-002 requires a decision on Alembic vs `create_all()` documentation fix.
- T-012 requires coordination on key management strategy.
