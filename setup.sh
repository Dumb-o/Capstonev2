#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "============================================"
echo "  FreeLedger — Project Setup"
echo "============================================"
echo ""

# ── 1. Prerequisites check ──────────────────────
echo "[1/6] Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required. Install Docker first."; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "ERROR: Node.js is required (v18+)."; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "ERROR: npm is required."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3.12+ is required."; exit 1; }

echo "  docker  ✓"
echo "  node    ✓ ($(node --version))"
echo "  npm     ✓ ($(npm --version))"
echo "  python3 ✓ ($(python3 --version))"
echo ""

# ── 2. Backend environment ──────────────────────
echo "[2/6] Setting up backend environment..."

cd "$ROOT/backend"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  Created Python virtual environment"
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  Python dependencies installed"
deactivate
echo ""

# ── 3. Frontend dependencies ────────────────────
echo "[3/6] Installing frontend dependencies..."

cd "$ROOT/frontend"
npm install --silent
echo "  Node dependencies installed"
echo ""

# ── 4. Start infrastructure (Docker) ────────────
echo "[4/6] Starting infrastructure (PostgreSQL, Redis, IPFS, Hardhat)..."

cd "$ROOT/docker"
docker compose up -d --wait 2>/dev/null || docker compose up -d
echo "  Infrastructure containers started"
echo ""

# ── 5. Run database migrations ──────────────────
echo "[5/6] Running database migrations..."

cd "$ROOT/backend"
source venv/bin/activate
alembic upgrade head
deactivate
echo "  Migrations applied"
echo ""

# ── 6. Done ─────────────────────────────────────
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Start the project with:"
echo ""
echo "    Terminal 1 (backend):  cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "    Terminal 2 (frontend): cd frontend && npm start"
echo ""
echo "  Open:  http://localhost:3000"
echo "============================================"
