#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "============================================"
echo "  FreeLedger — Project Setup"
echo "============================================"
echo ""

# ── 1. Prerequisites check ──────────────────────
echo "[1/7] Checking prerequisites..."

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
echo "[2/7] Setting up backend environment..."

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
echo "[3/7] Installing frontend dependencies..."

cd "$ROOT/frontend"
npm install --silent
echo "  Node dependencies installed"
echo ""

# ── 4. Start infrastructure (Docker) ────────────
echo "[4/7] Starting infrastructure (PostgreSQL, Redis, IPFS, Hardhat)..."

cd "$ROOT/docker"
docker compose up -d --wait 2>/dev/null || docker compose up -d
echo "  Infrastructure containers started"
echo ""

# ── 5. Run database migrations ──────────────────
echo "[5/7] Running database migrations..."

cd "$ROOT/backend"
source venv/bin/activate
alembic upgrade head
deactivate
echo "  Migrations applied"
echo ""

# ── 6. Build frontend ───────────────────────────
echo "[6/7] Building frontend (for single-server mode)..."
cd "$ROOT/frontend"
npx react-scripts build 2>/dev/null || npm run build 2>/dev/null || CI=false npm run build
echo "  Frontend built (served by backend on port 3001)"
echo ""

# ── 7. Start project servers ────────────────────
echo "[7/7] Starting project servers..."

mkdir -p "$ROOT/logs"

# Start backend (serves API + built frontend on port 3001)
cd "$ROOT/backend"
source venv/bin/activate
PYTHONPATH="$ROOT/backend" nohup uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload \
  > "$ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
deactivate
echo "  Backend started (PID: $BACKEND_PID) → http://localhost:3001"

# Start frontend dev server (hot-reload on port 3000)
cd "$ROOT/frontend"
nohup npm start > "$ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  Frontend started (PID: $FRONTEND_PID) → http://localhost:3000"

sleep 2
echo ""

# ── Done ────────────────────────────────────────
echo "============================================"
echo "  FreeLedger is running!"
echo ""
echo "  Single-server (API + UI):  http://localhost:3001"
echo "  Frontend dev server:       http://localhost:3000"
echo "  API docs (Swagger):        http://localhost:3001/docs"
echo ""
echo "  Logs:"
echo "    Backend:  logs/backend.log"
echo "    Frontend: logs/frontend.log"
echo ""
echo "  To stop:  kill $BACKEND_PID $FRONTEND_PID"
echo "============================================"
