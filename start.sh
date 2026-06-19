#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
TIMEOUT_WAIT=60

cleanup() {
    echo ""
    echo "Shutting down..."
    for pid_file in "$LOG_DIR"/*.pid; do
        [ -f "$pid_file" ] && kill "$(cat "$pid_file")" 2>/dev/null || true
    done
    echo "Done."
}
trap cleanup EXIT INT TERM

info()  { echo "  [INFO]  $*"; }
ok()    { echo "  [OK]    $*"; }
warn()  { echo "  [WARN]  $*"; }
fail()  { echo "  [FAIL]  $*"; exit 1; }

mkdir -p "$LOG_DIR"

echo "============================================"
echo "  FreeLedger — Start Development Environment"
echo "============================================"
echo ""

# ── 1. Prerequisites ──────────────────────────────
echo "[1/7] Checking prerequisites..."

command -v docker  >/dev/null 2>&1 || fail "Docker is required. Install from https://docs.docker.com/engine/install/"
command -v docker compose >/dev/null 2>&1 || fail "Docker Compose plugin is required."
command -v node    >/dev/null 2>&1 || fail "Node.js 18+ is required."
command -v npm     >/dev/null 2>&1 || fail "npm is required."
command -v python3 >/dev/null 2>&1 || fail "Python 3.12+ is required."

NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
PYTHON_VER=$(python3 --version | sed 's/Python //' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] 2>/dev/null || fail "Node.js 18+ required (found: $(node --version))"
[ "$PYTHON_VER" -ge 12 ] 2>/dev/null || fail "Python 3.12+ required (found: $(python3 --version))"

ok "docker    $(docker --version)"
ok "docker compose $(docker compose version)"
ok "node      $(node --version)"
ok "npm       $(npm --version)"
ok "python3   $(python3 --version)"
echo ""

# ── 2. Backend environment ────────────────────────
echo "[2/7] Setting up backend environment..."

cd "$ROOT/backend"

if [ ! -f ".env" ]; then
    cp .env.example .env
    sed -i 's|@postgres:|@localhost:|g; s|@redis:|@localhost:|g; s|@hardhat:|@localhost:|g; s|@ipfs:|@localhost:|g; s|http://hardhat|http://localhost|g; s|http://redis|http://localhost|g; s|http://ipfs|http://localhost|g' .env
    info "Created .env from .env.example (hostnames rewritten to localhost)"
else
    ok ".env already exists"
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
    info "Created Python virtual environment"
fi

source venv/bin/activate
pip install -q -r requirements.txt
deactivate
ok "Python dependencies installed"
echo ""

# ── 3. Frontend dependencies ──────────────────────
echo "[3/7] Setting up frontend environment..."

cd "$ROOT/frontend"

if [ ! -f ".env" ]; then
    cat > .env <<-EOF
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_IPFS_GATEWAY=http://localhost:8080
REACT_APP_BLOCKCHAIN_RPC=http://localhost:8545
REACT_APP_CHAIN_ID=31337
EOF
    info "Created frontend .env with default values"
fi

if [ ! -d "node_modules" ]; then
    npm install
else
    ok "node_modules already exists (run 'npm install' to update if needed)"
fi

if [ ! -d "$ROOT/contracts/node_modules" ]; then
    info "Installing contract dependencies..."
    cd "$ROOT/contracts"
    npm install --silent
    cd "$ROOT/frontend"
fi
ok "Node dependencies installed"
echo ""

# ── 4. Start infrastructure (Docker) ──────────────
echo "[4/7] Starting infrastructure (PostgreSQL, Redis, IPFS, Hardhat)..."

cd "$ROOT/docker"
if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q .; then
    warn "Some containers already running — ensuring they are up..."
fi
docker compose up -d --wait 2>/dev/null || docker compose up -d

echo ""
for svc in postgres redis ipfs hardhat; do
    cname="freeledger-$svc"
    if docker inspect "$cname" --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        ok "$cname is running"
    else
        warn "$cname is not running — check 'docker compose ps'"
    fi
done
echo ""

# ── 5. Run database migrations ────────────────────
echo "[5/7] Running database migrations..."

cd "$ROOT/backend"
source venv/bin/activate

_check_postgres() {
    local i=0
    while [ $i -lt $TIMEOUT_WAIT ]; do
        if python3 -c "
import psycopg2
try:
    psycopg2.connect('${DATABASE_URL_SYNC:-postgresql://freeledger:freeledger_dev@localhost:5432/freeledger}')
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; then
            return 0
        fi
        sleep 2
        i=$((i + 2))
    done
    return 1
}

if _check_postgres; then
    PYTHONPATH="$ROOT/backend" alembic upgrade head
    ok "Migrations applied"
else
    warn "Could not connect to PostgreSQL after ${TIMEOUT_WAIT}s — skipping migrations."
    warn "Run manually: cd backend && source venv/bin/activate && PYTHONPATH=\"\$PWD\" alembic upgrade head"
fi

deactivate
echo ""

# ── 6. Build frontend (for single-server fallback) ─
echo "[6/7] Building frontend for static serving..."

cd "$ROOT/frontend"
if [ ! -d "build" ]; then
    CI=false npm run build --silent 2>/dev/null || CI=false npm run build
    ok "Frontend built into frontend/build/"
else
    ok "frontend/build/ already exists (run 'CI=false npm run build' to rebuild)"
fi
echo ""

# ── 7. Start dev servers ─────────────────────────
echo "[7/7] Starting development servers..."

cd "$ROOT/backend"
source venv/bin/activate
PYTHONPATH="$ROOT/backend" nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
    > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"
deactivate
ok "Backend API    → http://localhost:8000      (PID: $(cat "$LOG_DIR/backend.pid"))"
ok "API Docs       → http://localhost:8000/docs"

cd "$ROOT/frontend"
nohup npm start > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"
ok "Client UI      → http://localhost:3000      (PID: $(cat "$LOG_DIR/frontend.pid"))"

nohup npm run start:admin > "$LOG_DIR/admin.log" 2>&1 &
echo $! > "$LOG_DIR/admin.pid"
ok "Admin Panel    → http://localhost:3001      (PID: $(cat "$LOG_DIR/admin.pid"))"

sleep 3
echo ""

# ── Done ─────────────────────────────────────────
echo "============================================"
echo "  FreeLedger is starting up!"
echo ""
echo "  Client UI:      http://localhost:3000"
echo "  Admin Panel:    http://localhost:3001"
echo "  Backend API:    http://localhost:8000"
echo "  API Docs:       http://localhost:8000/docs"
echo "  Health Check:   http://localhost:8000/api/health"
echo ""
echo "  Infrastructure (Docker):"
echo "    PostgreSQL    localhost:5432"
echo "    Redis         localhost:6379"
echo "    IPFS API      localhost:5001"
echo "    Hardhat RPC   localhost:8545"
echo ""
echo "  Logs:         $LOG_DIR/"
echo "  To stop:      Press Ctrl+C or run: kill \$(cat $LOG_DIR/*.pid 2>/dev/null)"
echo "============================================"
