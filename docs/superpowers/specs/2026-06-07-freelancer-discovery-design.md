# Freelancer Discovery & Messaging Enhancement

## Phase 5: Freelancer Discovery

### User Model Additions
- `headline` (String, nullable) — professional title
- `experience_level` (String, default `"mid"`) — `junior` / `mid` / `senior` / `lead`
- `industries` (JSON, default `[]`) — industry tags
- `is_available` (Boolean, default `True`) — availability toggle
- `portfolio_cids` (JSON, default `[]`) — IPFS CIDs

### Backend: GET /users/ with Filters
Add query parameters: `role`, `search` (ILIKE on username/headline/bio), `skills` (JSON overlap), `experience_level`, `is_available`, `min_rate`, `max_rate`. Return `PaginatedUsers` with `page`/`limit`.

### Frontend: FreelancerDirectory.js
- Search bar, filter row (skills, experience_level, rate, availability)
- Freelancer cards: avatar (initials), headline, name, skills tags, rating, rate, bio excerpt
- Invite button → modal with job picker + optional message → POST to messages API
- Follows ExploreJobs layout pattern

### Route & Nav
- `/freelancers` → `FreelancerDirectory` with `ClientRoute` guard
- Navbar: "Browse Freelancers" link for clients

---

## Phase 6: Messaging Enhancement

### People You May Know
New endpoint `GET /recommendations/people` matching by overlapping skills.

### Enhanced Chat UI
- Search filters conversations by username
- Timestamps shown as relative ("2h ago", "Yesterday")
- Unread indicator improvements

### Proposal-to-Message Integration
- When proposal submitted → auto-create message thread with system message
- System message format: `[Freelancer Name] submitted a proposal for [Job Title] — Bid: X ETH`
