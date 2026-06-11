# Admin Panel — Full Audit & Roadmap

**Last Updated**: June 11, 2026
**Status**: ~70% functional — 3 critical bugs resolved, 2 remaining

---

## ✅ Critical Bugs — Resolved

### B1. `UserResponse` schema missing `is_active` ✅ **RESOLVED** (prior session)
- **Fix**: `is_active: bool = True` added to `UserResponse` at `schemas.py:73`
- **Status**: Activate/Suspend toggle works correctly

### B3. `AdminStats` response model drops computed fields ✅ **RESOLVED** (prior session)
- **Fix**: `AdminStats` model at `schemas.py:295-302` includes `total_users`, `total_jobs`, `total_proposals`, `total_contracts`, `total_volume_eth`, `active_disputes`, `platform_fees_accumulated`
- **Status**: Dashboard shows all computed stats from API

---

## 🔴 Remaining Critical Issue

### B2. Dashboard Role Distribution depends on lazy-loaded `users` array
- **File**: `frontend/src/pages/AdminPanel.js:327-338`
- **Code**: `users.filter(u => u.role === r).length`
- **Impact**: `users` array is only populated when clicking the Users tab. On mount, it's empty. Dashboard "Role Distribution" always shows **all zeros**
- **Fix**: Add `role_counts` to `AdminStats` backend response (DONE in this session). Frontend should display from API data instead of filtering local array

---

## 🟠 Major Issues

### M1. No server-side search on contracts, proposals, disputes
- **Files**: `backend/app/routers/admin.py:223-248` (contracts), `:302-327` (proposals), `:359-384` (disputes)
- **Impact**: These endpoints have no `?search=` param. The frontend `filtered()` only searches the current page (20 items). If you have 1000 contracts, search only checks 20
- **Fix**: Add `search: str | None = Query(None)` to each endpoint, filtering by relevant fields

### M2. Edit modal renders all fields as plain text inputs
- **File**: `frontend/src/pages/AdminPanel.js:608-622`
- **Impact**: Enum fields like `role`, `status`, `decision` show as free-text inputs. Admin can type invalid values. Date fields show raw strings
- **Fix**: Add field-type detection: `select` for enums/roles, `textarea` for long text, `datetime` for dates, `number` for hourly_rate/budget

### M3. No confirmation for quick-action buttons
- **File**: `frontend/src/pages/AdminPanel.js:399-404, 467-468`
- **Impact**: "Close", "Reopen", "Complete", "Cancel" fire immediately — one click, no undo
- **Fix**: Wrap in confirmation dialog (or at least add brief undo toast)

### M4. Messages tab is read-only
- **File**: `frontend/src/pages/AdminPanel.js:523-542`
- **Impact**: Admin can view messages but can't delete, reply, or compose. If spam messages accumulate, there's no cleanup
- **Fix**: Add delete button to each message, optionally a reply modal

### M5. Contract status filter missing enum values
- **File**: `frontend/src/pages/AdminPanel.js:307`
- **Impact**: Contract filter dropdown shows only 7 of 10 statuses. Missing: `draft`, `pending_review`, `revision_requested`
- **Fix**: Add missing statuses: `draft`, `pending_review`, `revision_requested`

---

## 🟡 Moderate Issues

### E1. Role Distribution on dashboard needs users data
- **File**: `frontend/src/pages/AdminPanel.js:328-338`
- **Impact**: Dashboard "Role Distribution" counts from `users` array which is only populated after visiting Users tab
- **Fix**: Either compute from `AdminStats` (add role counts) or preload users

### E2. No admin audit log
- **Impact**: No record of who deleted/suspended/edited what. If an admin makes a mistake, there's no trace
- **Fix**: Create `admin_audit_log` table + middleware to log all admin mutations

### E3. Password reset from admin panel
- **Impact**: Admin can create users but cannot reset passwords. If a user forgets their password, admin has no way to help
- **Fix**: Add `POST /admin/users/{id}/reset-password` endpoint + "Reset Password" button in edit modal

### E4. Admin cannot create disputes
- **Impact**: Admin has no way to raise a dispute on behalf of a user
- **Fix**: Add `POST /admin/disputes` endpoint + UI in disputes tab

### E5. No CSV export
- **Impact**: No way to export users, jobs, contracts data for offline analysis
- **Fix**: Add "Export CSV" button to each tab, backend returns CSV stream

---

## 🟢 Polish & Minor Fixes

### P1. Better loading states on tab switch
- **Current**: Shows old data until new data loads (flash of stale content)
- **Fix**: Add per-tab loading spinner overlay

### P2. Inline error display on create/edit modals
- **Current**: Errors show via toast. Would be better to show inline next to the field
- **Fix**: Add field-level error messages in forms

### P3. Improve "Activate/Suspend" UX
- **Current**: Button text toggles but no visual difference besides color
- **Fix**: Add icon, tooltip explaining what suspension means (e.g., "Prevents login and API access")

### P4. Delete cascading
- **Current**: Deleting a user with active jobs/proposals/contracts may cause DB constraint errors
- **Fix**: Add cascade behavior or block deletion if entity has active dependents

### P5. Completed/Cancelled contracts shouldn't offer Complete/Cancel buttons
- **File**: `frontend/src/pages/AdminPanel.js:465`
- **Current**: Check is `c.status !== 'completed' && c.status !== 'cancelled'` — but what about `disputed`, `delivered`, `active`?
- **Fix**: Only show action buttons for statuses that support the transition

### P6. Unused `loadError` state
- **File**: `frontend/src/pages/AdminPanel.js:20`
- **Impact**: `loadError` is set but never rendered in the UI
- **Fix**: Show error banner if `loadError` is set

---

## Implementation Order

```
✅ RESOLVED — B1, B3 (already fixed in prior sessions)

Priority 1 (Critical remaining)
  B2 ──── Fix Role Distribution on dashboard (use API role_counts)

Priority 2 (Major functionality)
  M1 ──── Add server-side search to contracts/proposals/disputes
  M2 ──── Smart field rendering in edit modal (selects for enums)
  M3 ──── Confirmation on quick-action buttons
  M4 ──── Messages delete + reply
  M5 ──── Fix contract filter dropdown

Priority 3 (Enhancements)
  E1 ──── Fix Role Distribution on dashboard (same as B2)
  E2 ──── Admin audit log
  E3 ──── Password reset
  E4 ──── Admin create disputes
  E5 ──── CSV export

Priority 4 (Polish)
  P1-P6 ── UI polish, loading states, error handling
```

---

## File Reference Map

| Concern | Backend File | Frontend File | Schema File |
|---|---|---|---|
| B1 is_active | `admin.py:56-88` | `AdminPanel.js:351-372` | `schemas.py:56-76` |
| B2 stats | `admin.py:24-53` | `AdminPanel.js:253-277` | `schemas.py:294-299` |
| B3 AdminStats | `admin.py:24-53` | — | `schemas.py:294-299` |
| M1 server-side search | `admin.py:223-248, 302-327, 359-384` | `AdminPanel.js:34-46` | — |
| M2 smart fields | — | `AdminPanel.js:608-622` | — |
| M3 confirmations | — | `AdminPanel.js:399-404, 467-468` | — |
| M4 messages | `admin.py:330-356` | `AdminPanel.js:523-542` | — |
| M5 contract filters | — | `AdminPanel.js:307` | — |
