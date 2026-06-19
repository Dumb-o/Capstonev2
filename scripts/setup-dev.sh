#!/usr/bin/env bash
# =============================================================================
# FreeLedger — Developer Environment Setup Script
# =============================================================================
# Run from project root:
#   bash scripts/setup-dev.sh
#
# This script:
#   1. Starts Docker infrastructure (postgres, redis, ipfs, hardhat)
#   2. Compiles and deploys the GigEscrow smart contract
#   3. Installs backend dependencies
#   4. Runs database migrations
#   5. Seeds the database (email users + wallet users)
#   6. Installs frontend dependencies
#
# After this script completes, start the backend and frontend servers manually.
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== FreeLedger Developer Setup ==="
echo "Root: $ROOT_DIR"
echo ""

# ─── Step 1: Start Docker infrastructure ───────────────────────────────────
echo "[1/6] Starting Docker infrastructure..."
cd "$ROOT_DIR"
if docker compose -f docker/docker-compose.yml ps --status running 2>/dev/null | grep -q "postgres"; then
  echo "  Infrastructure already running. Skipping."
else
  docker compose -f docker/docker-compose.yml up -d postgres redis ipfs hardhat
  echo "  Waiting for services to be healthy..."
  sleep 10
fi
echo ""

# ─── Step 2: Compile and deploy smart contract ──────────────────────────────
echo "[2/6] Compiling and deploying smart contract..."
cd "$ROOT_DIR/contracts"
npm install --silent 2>/dev/null
npx hardhat compile --quiet 2>/dev/null || npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
echo ""

# ─── Step 3: Install backend dependencies ──────────────────────────────────
echo "[3/6] Installing backend Python dependencies..."
cd "$ROOT_DIR/backend"
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || pip install -r requirements.txt
echo ""

# ─── Step 4: Run database migrations ────────────────────────────────────────
echo "[4/6] Running database migrations..."
source venv/bin/activate
alembic upgrade head
echo ""

# ─── Step 5: Seed the database ─────────────────────────────────────────────
echo "[5/6] Seeding database..."
# Seed wallet users (Client Wallet = role=client, Freelancer Wallet = role=freelancer)
source venv/bin/activate
python -m scripts.seed_wallets
# Seed email users (50 sample users, jobs, proposals, contracts)
python seed_data.py 2>/dev/null || echo "  Email seed skipped (run 'python backend/seed_data.py' manually if needed)"
echo ""

# ─── Step 6: Install frontend dependencies ─────────────────────────────────
echo "[6/6] Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install --silent 2>/dev/null || npm install
echo ""

# ─── Summary ───────────────────────────────────────────────────────────────
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the backend:"
echo "     cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "  2. Start the frontend:"
echo "     cd frontend && npm start"
echo ""
echo "  3. Import wallets into MetaMask:"
echo "     Network:  Localhost 8545 (Chain ID 31337)"
echo "     Client:   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "     PK:       0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "     Freelancer: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "     PK:       0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo ""
echo "  4. Test:"
echo "     Client:    Connect Client Wallet → logs in as Client → create job"
echo "     Freelancer: Connect Freelancer Wallet → logs in as Freelancer → apply to job"
echo ""
