# Local Development Wallet Setup

## Overview

FreeLedger enforces a **One Wallet = One Role = One Account** architecture. A single wallet address can only ever have one role on the platform. This means **two separate wallets** are required for local development:

| Role | Wallet | Purpose |
|------|--------|---------|
| **Client** | Hardhat Account #0 | Create jobs, hire freelancers, fund contracts, approve milestones |
| **Freelancer** | Hardhat Account #1 | Submit proposals, submit deliverables, manage contracts |

This separation prevents the confusion that arises when a single wallet switches between roles, and more accurately represents how real users interact with the platform.

---

## Wallet Definitions

### Client Wallet

| Field | Value |
|-------|-------|
| **Address** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| **Private Key** | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Hardhat Account** | #0 (default deployer) |
| **Platform Role** | `client` |
| **ETH Balance** | 10,000 ETH (Hardhat default) |

The Client Wallet is the primary wallet. It is used for:
- Deploying the `GigEscrow` smart contract
- Creating on-chain escrow contracts
- Funding contracts with escrowed ETH
- Approving milestone payments (releasing funds)
- Raising and resolving disputes

### Freelancer Wallet

| Field | Value |
|-------|-------|
| **Address** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| **Private Key** | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Hardhat Account** | #1 |
| **Platform Role** | `freelancer` |
| **ETH Balance** | 10,000 ETH (Hardhat default) |

The Freelancer Wallet is used for:
- Submitting milestone deliverables
- Testing the freelancer dashboard and workflow

---

## Environment Configuration

### `backend/.env`

Both wallet private keys must be set in the backend environment:

```env
# Client Wallet — Hardhat Account #0
CLIENT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Freelancer Wallet — Hardhat Account #1
FREELANCER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

The `.env.example` file contains full documentation of all available settings.

### Docker Compose

In `docker/docker-compose.yml`, these keys are passed to the backend container as environment variables:

```yaml
backend:
  environment:
    CLIENT_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    FREELANCER_PRIVATE_KEY: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
```

---

## Hardhat Startup

### Step 1: Start the local Hardhat node

```bash
cd contracts
npx hardhat node --hostname 0.0.0.0
```

This starts a local Ethereum node on `http://127.0.0.1:8545` with Chain ID `31337`.

The node creates 20 pre-funded accounts by default. Accounts #0 (Client) and #1 (Freelancer) are the ones we use.

### Step 2: Deploy the GigEscrow contract

In a separate terminal:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

This deploys `GigEscrow.sol` and writes the contract address to:
- `backend/.env` (as `CONTRACT_ADDRESS`)
- `contracts/scripts/contract-address.txt` (full wallet reference)

### Using Docker

If using Docker (recommended):

```bash
docker compose -f docker/docker-compose.yml up -d hardhat
```

Then deploy:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

---

## MetaMask Setup

### Step 1: Add the Hardhat Network

1. Open MetaMask
2. Click the network selector → **Add Network** → **Add Network Manually**
3. Enter:
   - **Network Name**: `Hardhat Local`
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Click **Save**

### Step 2: Import the Client Wallet

1. Click the account circle → **Import Account**
2. Paste the Client private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. Click **Import**
4. Rename the account to "Client" for clarity (account → ... details → Edit name)

### Step 3: Import the Freelancer Wallet

1. Click the account circle → **Add Account or Hardware Wallet**
2. Click **Import Account**
3. Paste the Freelancer private key:
   ```
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```
4. Click **Import**
5. Rename the account to "Freelancer"

### Step 4: Verify Balances

Both accounts should show **10,000 ETH** (Hardhat default). If they show 0 ETH, the node may not be running or the RPC URL is incorrect.

### Step 5: Switching Between Accounts

Use the MetaMask account selector to switch between Client and Freelancer wallets. The platform frontend determines your role based on the currently connected wallet.

---

## Authentication Flow

### How Wallet Login Works

1. **Connect**: MetaMask returns the wallet address to the frontend.
2. **Challenge**: The backend generates a random nonce and stores it in Redis (5-minute TTL).
3. **Sign**: MetaMask prompts the user to sign the challenge message with their private key.
4. **Verify**: The backend recovers the signer's address from the signature and matches it against the claimed address.
5. **Login**:
   - If the wallet has **no account**: a new user is created with the selected role.
   - If the wallet **already has an account**: the existing user is returned. The role is **never** changed at this point.

### Role Separation

The role is locked at account creation:

```
Client Wallet     → POST /auth/login with role=client     → User.role = "client"
Freelancer Wallet → POST /auth/login with role=freelancer  → User.role = "freelancer"
```

Once set, the role can **never** be changed via the login endpoint. This is enforced in `backend/app/routers/auth.py` (the role toggle was removed).

Route-level enforcement is provided by the `RoleRequire` dependency in `backend/app/middleware/auth.py`:

- `POST /jobs` → requires `RoleRequire("client")`
- `POST /jobs/{id}/proposals` → requires `RoleRequire("freelancer")`
- `POST /contracts` → requires `RoleRequire("client")`

### Seed Script

The `backend/scripts/seed_wallets.py` script pre-creates both wallet-based user accounts so you can log in immediately:

```bash
cd backend
python -m scripts.seed_wallets
```

This creates:
- Wallet `0xf39Fd...` → user with `role=client`, username `client_dev`
- Wallet `0x709979...` → user with `role=freelancer`, username `freelancer_dev`

---

## Testing Workflow

### Full Setup (One Command)

```bash
bash scripts/setup-dev.sh
```

This runs all 6 steps: Docker infra, contract deploy, backend deps, migrations, seed, frontend deps.

Then start servers:

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend && npm start
```

### Client Workflow

1. Open the app at `http://localhost:3000`
2. Click **Sign In** (or **Get Started**)
3. Switch MetaMask to the **Client** account
4. Select **Client** role in the role selector
5. Click **Connect with MetaMask**
6. Sign the message in MetaMask
7. You are redirected to `/client/dashboard`
8. **Create a job**: Fill in title, budget, category, skills → submit
9. View proposals on a job (once freelancers apply)
10. **Hire a freelancer**: Accept a proposal → contract is created
11. **Fund the contract**: Sign + fund on-chain

### Freelancer Workflow

1. Open the app at `http://localhost:3000`
2. Switch MetaMask to the **Freelancer** account
3. Click **Sign In**
4. Select **Freelancer** role
5. Click **Connect with MetaMask**
6. Sign the message
7. You are redirected to `/freelancer/dashboard`
8. **Browse jobs**: Explore open jobs
9. **Submit a proposal**: Set bid amount and cover letter
10. **Manage contracts**: View accepted proposals and active contracts
11. **Submit milestones**: Upload deliverables

---

## Troubleshooting

### "Account not found" or "User not found" on login

The wallet seed script wasn't run, or the database was reset. Run:

```bash
cd backend && python -m scripts.seed_wallets
```

Or just register a new account by connecting MetaMask and selecting your role — the backend will create the user on first login.

### MetaMask shows "0 ETH"

The Hardhat node isn't running. Start it:

```bash
cd contracts && npx hardhat node --hostname 0.0.0.0
```

If using Docker, restart the hardhat container:

```bash
docker compose -f docker/docker-compose.yml restart hardhat
```

### "Nonce too low" or transaction failures

Hardhat resets its state when restarted. If you restart the Hardhat node, you need to:

1. Re-deploy the contract (`npx hardhat run scripts/deploy.js --network localhost`)
2. The database state (users, jobs, contracts) is **separate** — it persists in PostgreSQL

### "Invalid signature" on login

A common issue when the wrong MetaMask account is selected. Ensure:

- The Client account in MetaMask matches `0xf39Fd...`
- The Freelancer account matches `0x709979...`
- You're signing with the correct account

### "Client access required" when trying to create a job

Your connected MetaMask wallet is not associated with a `client` role. Either:
- Switch to the Client wallet in MetaMask
- Or run the seed script to pre-create both accounts with the correct roles

### "Freelancer access required" when trying to submit a proposal

Switch to the Freelancer wallet in MetaMask.

### Docker networking issues

The backend running outside Docker (`uvicorn`) connects to `localhost:8545`. The backend running in Docker connects to `http://hardhat:8545`. If you switch between modes, ensure the `RPC_URL` in `.env` matches your setup.

---

## Architecture Notes

### Why Separate Wallets?

Using separate wallets for each role:

1. **Eliminates role confusion**: No single wallet can accidentally become a client and freelancer.
2. **Matches real-world usage**: Real users have one wallet with one identity.
3. **Simplifies testing**: Client and Freelancer workflows can be tested simultaneously in two browser tabs.
4. **Cleaner auditing**: Transaction history belongs to one role, not mixed.

### How Role Is Enforced

| Layer | Enforcement | Location |
|-------|-------------|----------|
| **Database** | `wallet_address` has `unique=True` constraint | `models.py:90` |
| **Backend API** | `RoleRequire` dependency on creation endpoints | `middleware/auth.py:52` |
| **Backend Login** | Role is locked at account creation; never changed on re-login | `routers/auth.py:72-79` |
| **Frontend Routing** | `ClientRoute` / `FreelancerRoute` guards | `App.js:29-51` |

### Key Files

| File | Purpose |
|------|---------|
| `backend/scripts/seed_wallets.py` | Pre-creates wallet-based users |
| `backend/.env` | Wallet private keys and config |
| `backend/app/routers/auth.py` | Wallet login logic |
| `backend/app/middleware/auth.py` | `RoleRequire` dependency |
| `contracts/scripts/deploy.js` | Contract deployment with wallet info |
| `scripts/setup-dev.sh` | Full environment setup |
| `docs/local-wallet-setup.md` | This document |
