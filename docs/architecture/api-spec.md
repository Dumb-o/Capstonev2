# FreeLedger — API Specification

**Base URL**: `http://localhost:8000/api`
**Auth Scheme**: JWT Bearer token in `Authorization` header
**Error Shape**: `{ "detail": "message", "code": "ERROR_CODE" }`
**Success Shape**: Standard JSON object per endpoint

---

## Authentication

```
POST /auth/challenge
  Request:  { "address": "0xabc..." }
  Response: { "nonce": "a1b2c3d4..." }
  Status: 200

POST /auth/login
  Request:  { "address": "0xabc...", "signature": "0x..." }
  Response: { "access_token": "eyJ...", "refresh_token": "eyJ...", "user": { User } }
  Status: 200 | 401

POST /auth/refresh
  Request:  { "refresh_token": "eyJ..." }
  Response: { "access_token": "eyJ...", "refresh_token": "eyJ..." }
  Status: 200 | 401

POST /auth/logout
  Headers:  Authorization: Bearer <token>
  Response: { "message": "logged_out" }
  Status: 200

GET /auth/me
  Headers:  Authorization: Bearer <token>
  Response: { "user": { User } }
  Status: 200 | 401
```

---

## Users

```
GET /users/{user_id}
  Response: { "user": { User } }
  Status: 200 | 404

PUT /users/me
  Headers:  Authorization: Bearer <token>
  Request:  { "username"?, "bio"?, "skills"?, "hourly_rate"?, "avatar_cid"? }
  Response: { "user": { User } }
  Status: 200 | 401
```

---

## Jobs

```
POST /jobs
  Headers:  Authorization: Bearer <token>
  Request:  { "title", "description", "budget", "category", "skills": [], "duration_days" }
  Response: { "job": { Job } }
  Status: 201 | 401

GET /jobs
  Query:    ?category=&skill=&min_budget=&max_budget=&status=&page=1&limit=20
  Response: { "jobs": [Job], "total": 50, "page": 1, "pages": 3 }
  Status: 200

GET /jobs/{id}
  Response: { "job": { Job }, "poster": { User } }
  Status: 200 | 404

PUT /jobs/{id}
  Headers:  Authorization: Bearer <token>
  Request:  { "title"?, "description"?, "budget"?, "status"? }
  Response: { "job": { Job } }
  Status: 200 | 401 | 403

DELETE /jobs/{id}
  Headers:  Authorization: Bearer <token>
  Response: { "message": "closed" }
  Status: 200 | 401 | 403
```

---

## Proposals

```
POST /jobs/{job_id}/proposals
  Headers:  Authorization: Bearer <token>
  Request:  { "cover_letter", "bid_amount", "estimated_days" }
  Response: { "proposal": { Proposal } }
  Status: 201 | 401

GET /jobs/{job_id}/proposals
  Headers:  Authorization: Bearer <token>
  Response: { "proposals": [Proposal] }
  Status: 200 | 401 | 403 (client only — owner checks)

GET /proposals/mine
  Headers:  Authorization: Bearer <token>
  Query:    ?status=&page=1&limit=20
  Response: { "proposals": [Proposal], "total": 10 }
  Status: 200 | 401

PUT /proposals/{id}
  Headers:  Authorization: Bearer <token>
  Request:  { "status": "accepted" | "rejected" }
  Response: { "proposal": { Proposal } }
  Status: 200 | 401 | 403
```

---

## Contracts

```
POST /contracts
  Headers:  Authorization: Bearer <token>
  Request:  {
    "job_id"?, "freelancer_id", "client_id", "title", "description",
    "total_amount", "deadline",
    "milestones": [{ "description", "amount", "due_date" }]
  }
  Response: { "contract": { Contract } }
  Status: 201 | 401

GET /contracts
  Headers:  Authorization: Bearer <token>
  Query:    ?status=&role=client|freelancer&page=1&limit=20
  Response: { "contracts": [Contract], "total": 25 }
  Status: 200 | 401

GET /contracts/{id}
  Headers:  Authorization: Bearer <token>
  Response: { "contract": { Contract }, "milestones": [Milestone], "deliverables": [Deliverable] }
  Status: 200 | 401 | 403

POST /contracts/{id}/sign
  Headers:  Authorization: Bearer <token>
  Response: { "contract": { Contract } }
  Status: 200 | 401 | 403 | 400 (already signed)
```

---

## Milestones

```
GET /contracts/{id}/milestones
  Headers:  Authorization: Bearer <token>
  Response: { "milestones": [Milestone] }
  Status: 200 | 401 | 403

POST /contracts/{id}/milestones/{index}/submit
  Headers:  Authorization: Bearer <token>
  Request:  { "deliverable_cid": "Qm...", "notes"?: "..." }
  Response: { "milestone": { Milestone } }
  Status: 200 | 401 | 403 | 400 (not your turn)

POST /contracts/{id}/milestones/{index}/approve
  Headers:  Authorization: Bearer <token>
  Response: { "milestone": { Milestone }, "tx_hash": "0x..." }
  Status: 200 | 401 | 403 | 400 (not submitted)

POST /contracts/{id}/milestones/{index}/reject
  Headers:  Authorization: Bearer <token>
  Request:  { "reason": "..." }
  Response: { "milestone": { Milestone } }
  Status: 200 | 401 | 403 | 400
```

---

## Disputes

```
POST /contracts/{id}/disputes
  Headers:  Authorization: Bearer <token>
  Request:  { "raised_by": "client" | "freelancer", "reason": "..." }
  Response: { "dispute": { Dispute } }
  Status: 201 | 401 | 403

GET /disputes
  Headers:  Authorization: Bearer <token>
  Query:    ?status=&page=1&limit=20
  Response: { "disputes": [Dispute] }
  Status: 200 | 401

GET /disputes/{id}
  Headers:  Authorization: Bearer <token>
  Response: { "dispute": { Dispute }, "contract": { Contract }, "deliverables": [Deliverable] }
  Status: 200 | 401 | 403
```

---

## Admin

```
GET /admin/disputes
  Headers:  Authorization: Bearer <token> (admin only)
  Query:    ?status=&page=1&limit=20
  Response: { "disputes": [Dispute] }
  Status: 200 | 401 | 403

POST /admin/disputes/{id}/resolve
  Headers:  Authorization: Bearer <token> (admin only)
  Request:  { "decision": "refund" | "release", "notes"?: "..." }
  Response: { "dispute": { Dispute }, "tx_hash": "0x..." }
  Status: 200 | 401 | 403 | 400

GET /admin/users
  Headers:  Authorization: Bearer <token> (admin only)
  Query:    ?page=1&limit=20
  Response: { "users": [User], "total": 100 }
  Status: 200 | 401 | 403

GET /admin/stats
  Headers:  Authorization: Bearer <token> (admin only)
  Response: { "total_users", "total_contracts", "total_volume_eth", "active_disputes", "platform_fees_accumulated" }
  Status: 200 | 401 | 403
```

---

## IPFS

```
POST /ipfs/upload
  Headers:  Authorization: Bearer <token>
  Body:     multipart/form-data (field: "file")
  Response: { "cid": "Qm...", "size": 12345, "mime_type": "application/pdf" }
  Status: 200 | 401 | 413 (file too large)

GET /ipfs/download/{cid}
  Response: Binary file stream
  Status: 200 | 404
```

---

## Messages

```
GET /messages/conversations
  Headers:  Authorization: Bearer <token>
  Response: { "conversations": [{ "user": User, "last_message": Message, "unread": 3 }] }
  Status: 200 | 401

GET /messages/conversations/{user_id}
  Headers:  Authorization: Bearer <token>
  Query:    ?page=1&limit=50
  Response: { "messages": [Message], "total": 30 }
  Status: 200 | 401

POST /messages/send
  Headers:  Authorization: Bearer <token>
  Request:  { "receiver_id": "...", "content": "..." }
  Response: { "message": { Message } }
  Status: 201 | 401
```

---

## Domain Models (JSON Shape)

### User
```json
{
  "id": "usr_a1b2c3d4",
  "username": "alice",
  "role": "client" | "freelancer",
  "wallet_address": "0x...",
  "bio": "Full-stack developer",
  "skills": ["Solidity", "React"],
  "hourly_rate": 50.0,
  "rating": 4.8,
  "avatar_cid": "Qm...",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Job
```json
{
  "id": "job_1234",
  "client_id": "usr_...",
  "title": "Build a DApp",
  "description": "...",
  "budget": 5.0,
  "category": "blockchain",
  "skills": ["Solidity", "React"],
  "duration_days": 30,
  "status": "open" | "in_progress" | "filled" | "closed",
  "created_at": "..."
}
```

### Contract
```json
{
  "id": "ct_5678",
  "job_id": "job_1234" | null,
  "client_id": "usr_...",
  "freelancer_id": "usr_...",
  "title": "...",
  "description": "...",
  "total_amount": 5.0,
  "deadline": "2026-02-01",
  "on_chain_id": null | 1,
  "contract_address": null | "0x...",
  "terms_cid": "Qm...",
  "status": "draft" | "pending_signatures" | "active" | "completed" | "cancelled" | "disputed",
  "client_signed": false,
  "freelancer_signed": false,
  "created_at": "..."
}
```

### Milestone
```json
{
  "id": "ms_9012",
  "contract_id": "ct_...",
  "index": 1,
  "description": "Design wireframes",
  "amount": 1.5,
  "due_date": "2026-01-15",
  "deliverable_cid": null | "Qm...",
  "submission_notes": null | "...",
  "status": "pending" | "submitted" | "approved" | "rejected",
  "submitted_at": null | "...",
  "approved_at": null | "..."
}
```

### Dispute
```json
{
  "id": "dp_3456",
  "contract_id": "ct_...",
  "raised_by": "client" | "freelancer",
  "reason": "...",
  "status": "open" | "under_review" | "resolved",
  "decision": null | "refund" | "release",
  "resolved_by": null | "usr_...",
  "resolution_notes": null | "...",
  "created_at": "...",
  "resolved_at": null | "..."
}
```

### Message
```json
{
  "id": "msg_7890",
  "sender_id": "usr_...",
  "receiver_id": "usr_...",
  "content": "...",
  "read": false,
  "created_at": "..."
}
```
