# FreeLedger — Project User Guide

## Overview

FreeLedger is a decentralized freelance platform that connects clients and freelancers using Ethereum blockchain technology for secure, transparent payments.

**Purpose**: To provide a trust-minimized freelancing experience where payments are held in smart contract escrow and automatically released when milestones are approved.

**Target Users**:
- **Clients**: Hire freelancers, create contracts with milestones, release payments
- **Freelancers**: Find jobs, submit proposals, deliver work, get paid via smart contracts
- **Administrators**: Manage platform users, resolve disputes, view analytics

## System Requirements

### Hardware
- 4GB RAM minimum, 8GB recommended
- 2GB free disk space
- Internet connection

### Software
- **Operating System**: Windows 10+, macOS 12+, Ubuntu 20.04+
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+ (with MetaMask extension)
- **MetaMask**: Browser extension (required for wallet authentication)
- **Node.js**: 18+ (for development only)
- **Python**: 3.10+ (for development only)
- **Docker & Docker Compose**: (recommended for setup)

## Quick Start

### 1. Install MetaMask
1. Install the [MetaMask browser extension](https://metamask.io/download/)
2. Create a wallet or import existing
3. Add Hardhat local network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

### 2. Start the Application

```bash
# Clone the repository
git clone <repository-url>
cd Capstone_Pawan_Completed

# Start infrastructure (PostgreSQL, Redis, IPFS, Hardhat node)
docker compose -f docker/docker-compose.yml up -d

# Deploy smart contract
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

# Start backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 3001

# In a new terminal, start frontend
cd ../frontend
npm install
npm start
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/api/health

### 4. Import Test Accounts
For development, import Hardhat test accounts into MetaMask:
- **Account 1 (Client)**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Account 2 (Freelancer)**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Each has 10,000 test ETH

---

## Features

### 1. Wallet Authentication
**Description**: Log in by connecting your MetaMask wallet and signing a cryptographic challenge.
**Benefits**: No passwords to remember; wallet IS your identity.
**Usage**:
1. Click "Connect Wallet" on the login page
2. Approve the MetaMask connection request
3. Sign the message displayed by MetaMask
4. Choose your role (Client or Freelancer)
5. You're logged in!

### 2. Email Authentication
**Description**: Alternative registration/login using email and password.
**Benefits**: No MetaMask required for basic platform use.
**Usage**: Click "Email Login" or "Email Register" on the login page.

### 3. Job Posting (Clients)
**Description**: Create job listings with title, description, budget, category, and required skills.
**Usage**:
1. From the Client Dashboard, click "Post a Job"
2. Fill in the job details
3. Submit — the job appears in the job marketplace

### 4. Job Discovery (Freelancers)
**Description**: Browse available jobs with filtering by budget, category, and skills.
**Usage**:
1. Click "Find Jobs" in the sidebar
2. Use filters to narrow results
3. Click a job to view details and submit a proposal

### 5. Proposal Submission (Freelancers)
**Description**: Submit proposals with cover letter, bid amount, and estimated duration.
**Usage**:
1. Open a job you're interested in
2. Click "Submit Proposal"
3. Enter your cover letter, bid amount, and estimated days
4. Submit — the client will receive your proposal

### 6. Proposal Management (Clients)
**Description**: Review proposals and accept or reject them.
**Usage**:
1. Open your job listing
2. View all proposals received
3. Click "Accept" to approve — a contract is automatically created
4. Click "Reject" to decline

### 7. Contract Creation & Signing
**Description**: Both parties sign the contract before work begins.
**Usage**:
1. After proposal acceptance, the contract is auto-created
2. Both client and freelancer click "Sign" on the contract detail page
3. After both sign, the contract enters "Pending Funding" state

### 8. Contract Funding (Clients)
**Description**: Fund the contract by depositing ETH into the smart contract escrow.
**Usage**:
1. On the contract detail page, click "Fund Contract"
2. Confirm the transaction in MetaMask
3. The contract becomes "Active" — work can begin

### 9. Milestone Submission (Freelancers)
**Description**: Submit deliverables for each milestone in the contract.
**Usage**:
1. On the contract detail page, find the milestone
2. Upload your deliverable file (stored on IPFS)
3. Submit — the client receives notification

### 10. Milestone Approval (Clients)
**Description**: Review and approve/reject submitted milestones.
**Usage**:
1. Click the deliverable link to view the work
2. Click "Approve" to release payment or "Reject" to request revisions
3. On approval, ETH is automatically transferred from escrow to the freelancer

### 11. Dispute Resolution
**Description**: Raise disputes when issues arise.
**Usage**:
1. On the contract detail page, click "Raise Dispute"
2. Explain the issue
3. Admin reviews and resolves (refund to client or release to freelancer)

### 12. Messaging
**Description**: Communicate with other platform users.
**Usage**:
1. Click "Messages" in the sidebar
2. Select a conversation or start a new one
3. Send and receive messages

### 13. Admin Panel
**Description**: Platform management interface.
**Usage**:
1. Log in as an admin user
2. Navigate to the Admin Panel
3. Tabs: Dashboard, Users, Jobs, Proposals, Contracts, Disputes, Messages
4. Perform CRUD operations, resolve disputes, view analytics

---

## User Roles

### Client
- Post jobs
- Review and accept/reject proposals
- Sign contracts
- Fund contracts (deposit ETH into escrow)
- Approve/reject milestone submissions
- Raise disputes
- Send/receive messages

### Freelancer
- Browse available jobs
- Submit proposals
- Sign contracts
- Submit milestone deliverables
- Receive payments via smart contract escrow
- Raise disputes
- Send/receive messages

### Admin
- View platform statistics
- Manage all users (create, edit, suspend, delete)
- Manage all jobs, proposals, contracts
- Resolve disputes (release payment or refund)
- View all messages
- Access to the full Admin Panel

---

## Screens & Components

### Login Page
- Wallet connect button
- Email login/register forms
- Role selection

### Client Dashboard
- Statistics (active projects, open jobs, total spent)
- Quick actions (Post a Job, Create Contract)
- My Job Postings list
- Active Projects
- Proposals Received

### Freelancer Dashboard
- Statistics (active contracts, earnings, completed projects)
- Active Contracts
- My Proposals
- Recommended Jobs (AI-matched)
- Quick actions

### Explore Jobs
- Job listing with filters
- Search by title/category/budget
- Paginated results

### Job Detail
- Full job description
- Required skills and budget
- Submit Proposal form (freelancers)
- Proposals list (clients)

### Contract Detail
- Contract metadata (amount, parties, status)
- Milestone checklist with status
- Sign buttons
- Fund button (client)
- Milestone submit/approve/reject controls
- Dispute information
- Raise Dispute button

### Messages
- Conversation list with unread counts
- Chat view with message history
- Send message form

### Profile
- Username, headline, bio
- Skills, hourly rate, experience level
- Avatar upload (IPFS)

### Admin Panel
- Stats dashboard (users, jobs, contracts, volume, disputes)
- User management (CRUD, suspend/activate)
- Job management
- Proposal management
- Contract management
- Dispute resolution
- Message management

---

## API Usage

Base URL: `http://localhost:3001/api`

### Authentication
```javascript
// Step 1: Get challenge
POST /auth/challenge
{ "address": "0x..." }
→ { "nonce": "Sign this message..." }

// Step 2: Login with signature
POST /auth/login
{ "address": "0x...", "signature": "0x...", "role": "freelancer" }
→ { "access_token": "eyJ...", "refresh_token": "eyJ...", "user": {...} }
```

### Common Patterns
All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

### Key Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | No | Service health check |
| POST | /api/auth/challenge | No | Get signing challenge |
| POST | /api/auth/login | No | Authenticate with wallet |
| POST | /api/auth/email/register | No | Email registration |
| POST | /api/auth/email/login | No | Email login |
| GET | /api/auth/me | Yes | Current user info |
| GET | /api/users/me | Yes | User profile |
| PUT | /api/users/me | Yes | Update profile |
| POST | /api/jobs | Yes | Create job |
| GET | /api/jobs | No | List jobs (with filters) |
| POST | /api/jobs/{id}/proposals | Yes | Submit proposal |
| PUT | /api/proposals/{id} | Yes | Accept/reject proposal |
| POST | /api/contracts | Yes | Create contract |
| GET | /api/contracts | Yes | List contracts |
| POST | /api/contracts/{id}/sign | Yes | Sign contract |
| POST | /api/contracts/{id}/fund | Yes | Fund contract |
| POST | /api/contracts/{id}/milestones/{idx}/submit | Yes | Submit milestone |
| POST | /api/contracts/{id}/milestones/{idx}/approve | Yes | Approve milestone |
| POST | /api/contracts/{id}/disputes | Yes | Raise dispute |
| GET | /api/admin/stats | Admin | Platform stats |
| GET | /api/admin/disputes | Admin | All disputes |
| POST | /api/admin/disputes/{id}/resolve | Admin | Resolve dispute |

---

## Troubleshooting

### MetaMask Issues

| Problem | Solution |
|---|---|
| "MetaMask is not installed" | Install the MetaMask browser extension |
| "Connection rejected" | Approve the connection request in MetaMask |
| "MetaMask is already processing" | Check MetaMask for a pending request |
| "No accounts found" | Unlock your wallet in MetaMask |
| Transaction fails | Ensure you have enough ETH in your account |
| Wrong network | Switch MetaMask to the correct network (Hardhat: localhost:8545, chain 31337) |

### Application Issues

| Problem | Solution |
|---|---|
| Backend won't start | Check Docker services: `docker compose ps` |
| Database connection error | Ensure PostgreSQL container is running: `docker compose up -d postgres` |
| IPFS upload fails | Ensure IPFS container is running: `docker compose up -d ipfs` |
| "Contract not found" | Deploy the smart contract: `npx hardhat run scripts/deploy.js` |
| Frontend shows blank page | Check browser console for errors; ensure API URL is correct in `.env` |
| CORS errors | Ensure backend is running on the configured port |

---

## Best Practices

### For Clients
- Clearly describe job requirements and expected deliverables
- Set realistic budgets and milestones
- Review portfolios and proposals before accepting
- Fund contracts before work begins
- Provide constructive feedback on milestone rejections
- Communicate via the messaging system for record-keeping

### For Freelancers
- Submit professional, complete proposals
- Upload deliverables to IPFS through the platform
- Meet milestone deadlines
- Communicate proactively about any delays
- Raise disputes only when resolution attempts fail

### For Administrators
- Review dispute details carefully before resolving
- Consider context from messages between parties
- Document resolution decisions thoroughly

### Security
- Never share your MetaMask seed phrase or private keys
- Verify contract details before signing
- Only fund contracts after both parties have signed
- Keep your MetaMask wallet secure
- Use test accounts for development only
- In production, never use the default JWT secret

---

## FAQ

**Q: Do I need ETH to use FreeLedger?**
A: Yes, for funding contracts and receiving payments. On the test network, you get free test ETH.

**Q: Are my funds safe?**
A: Funds are held in a smart contract escrow. Only the admin can force-release in dispute cases. Normal payments are released only when you approve milestones.

**Q: Can I cancel a contract?**
A: Before funding, contracts can be cancelled. After funding, a dispute must be raised for admin resolution.

**Q: What is IPFS used for?**
A: Contract terms and milestone deliverables are stored on IPFS, a decentralized file system. This ensures tamper-proof record-keeping.

**Q: Can I use FreeLedger without MetaMask?**
A: Yes, you can register with email/password for basic features. Blockchain features (contract funding, payments) still require MetaMask.

**Q: What happens if a dispute is raised?**
A: The contract is paused. An admin reviews and decides: refund the client or release payment to the freelancer.

**Q: How do I get test ETH?**
A: Hardhat test accounts come with 10,000 ETH each. Import the private keys listed in the Quick Start guide.
