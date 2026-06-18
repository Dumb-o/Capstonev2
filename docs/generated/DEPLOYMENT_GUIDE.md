# FreeLedger Deployment Guide

## Architecture Overview

FreeLedger is a decentralized freelance escrow platform. It consists of 5 Docker services:

| Service     | Technology              | Port   | Purpose                                    |
|-------------|-------------------------|--------|--------------------------------------------|
| **postgres**  | PostgreSQL 15         | 5432   | Primary database                           |
| **redis**     | Redis 7               | 6379   | Session storage, rate limiting, caching    |
| **ipfs**      | Kubo v0.28.0          | 5001/8080 | Decentralized file storage for deliverables |
| **hardhat**   | Hardhat (Node.js 18)  | 8545   | Local Ethereum dev node / Smart contract    |
| **backend**   | Python 3.14 (FastAPI) | 8000   | REST API + Web3 integration                |
| **frontend**  | React 18 (nginx)      | 3000   | Single-page application                    |

## Infrastructure Requirements

### Minimum Specs (Development / Staging)
- 2 vCPU, 4 GB RAM, 20 GB SSD
- Docker Engine 24+ and Docker Compose v2+
- Linux kernel 5.x+ recommended

### Recommended Specs (Production)
- 4 vCPU, 8 GB RAM, 50 GB SSD (or network-attached)
- Docker Engine 24+ with Docker Compose v2+
- Reverse proxy (nginx, Caddy, or Traefik) for SSL termination
- Managed PostgreSQL 15 (AWS RDS, Supabase, or self-hosted)
- Managed Redis 7 (Upstash, ElastiCache, or self-hosted)

> **Security Note**: This architecture uses a single `CLIENT_PRIVATE_KEY` for all on-chain escrow operations. In production, use a multi-sig wallet, an external signer (e.g., AWS KMS, HashiCorp Vault), or a DAO-governed contract. Single-key signing is a known architectural limitation. See `docs/architecture/security.md`.

## Environment Variables

All configuration is read from `backend/.env` (auto-created from `.env.example` on first start). Key variables:

### Database
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://freeledger:freeledger_dev@localhost:5432/freeledger` | Async connection string |
| `DATABASE_URL_SYNC` | `postgresql://freeledger:freeledger_dev@localhost:5432/freeledger` | Sync connection string |
| `PG_HOST` | `localhost` | PostgreSQL hostname (for docker health checks) |

### Redis
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `REDIS_HOST` | `localhost` | Redis hostname (for docker health checks) |

### JWT Authentication
| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-this-to-a-random-secret-in-production` | Primary signing secret |
| `JWT_SECRETS` | (empty) | Comma-separated fallback secrets for key rotation |
| `JWT_ALGORITHM` | `HS256` | Signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |

### Blockchain
| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `http://127.0.0.1:8545` | Ethereum RPC endpoint |
| `CHAIN_ID` | `31337` | Chain ID (1=Mainnet, 11155111=Sepolia) |
| `CONTRACT_ADDRESS` | (empty) | Deployed GigEscrow contract address |
| `CLIENT_PRIVATE_KEY` | (empty) | Primary signing key for escrow operations |
| `FREELANCER_PRIVATE_KEY` | (empty) | Freelancer signing key |
| `BLOCKCHAIN_TIMEOUT` | `30` | RPC call timeout (seconds) |
| `BLOCKCHAIN_TX_TIMEOUT` | `120` | Transaction receipt timeout (seconds) |

### IPFS
| Variable | Default | Description |
|----------|---------|-------------|
| `IPFS_API_URL` | `http://127.0.0.1:5001` | Kubo RPC API endpoint |

### Application
| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_FEE_BPS` | `250` | Platform fee (250 = 2.5%) |
| `REPIN_INTERVAL_SECONDS` | `21600` | IPFS repin interval (6 hours) |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins |
| `LOG_LEVEL` | `DEBUG` | Logging level |

### Frontend Build Args (Docker only)
| Arg | Default | Description |
|-----|---------|-------------|
| `REACT_APP_API_URL` | `/api` | Backend API base URL (proxied through nginx) |
| `REACT_APP_IPFS_GATEWAY` | `/ipfs` | IPFS gateway URL (proxied through nginx) |
| `REACT_APP_CONTRACT_ADDRESS` | (not set) | Deployed contract address |

## Docker Compose Deployment

### Development
```bash
# Clone and enter the project
git clone <repo-url>
cd freeledger

# Start all services
docker compose -f docker/docker-compose.yml up -d

# Check logs
docker compose -f docker/docker-compose.yml logs -f backend

# Stop everything
docker compose -f docker/docker-compose.yml down
```

### Production
1. Copy `docker/docker-compose.yml` and customize for your environment.
2. Set `POSTGRES_PASSWORD` to a strong random value.
3. Set `JWT_SECRET` (generate via `python -c "import secrets; print(secrets.token_urlsafe(32))"`).
4. Set `CLIENT_PRIVATE_KEY` and `FREELANCER_PRIVATE_KEY` via Docker secrets or env vars (never hardcode).
5. Set `RPC_URL` to your production Ethereum RPC endpoint.
6. Set `CHAIN_ID` to your target network (1=Mainnet, 11155111=Sepolia).
7. Set `CORS_ORIGINS` to your frontend domain(s).
8. Set `LOG_LEVEL` to `INFO` or `WARNING`.

#### Minimal production docker-compose extract:
```yaml
backend:
  environment:
    DATABASE_URL: postgresql+asyncpg://freeledger:<password>@<host>:5432/freeledger
    REDIS_URL: redis://<user>:<password>@<host>:6379/0
    RPC_URL: https://sepolia.infura.io/v3/<project-id>
    JWT_SECRET: <generated-secret>
    CLIENT_PRIVATE_KEY: <from-secret-manager>
    CHAIN_ID: "11155111"
    CORS_ORIGINS: https://app.freeledger.example.com
    LOG_LEVEL: INFO
```

## Frontend Deployment

### Option A: Via Docker Compose (Recommended)
The frontend builds inside Docker using a multi-stage build:
1. **Build stage**: `node:18-alpine` installs dependencies, runs `npm run build`.
2. **Serve stage**: `nginx:alpine` serves the static build via nginx.
3. Nginx proxies `/api/` to the backend and `/ipfs/` to the IPFS node.

### Option B: Standalone (for CDN / S3)
```bash
cd frontend
npm ci
REACT_APP_API_URL=https://api.freeledger.example.com \
REACT_APP_IPFS_GATEWAY=https://ipfs-gateway.example.com \
npm run build
# Deploy build/ to any static host (S3 + CloudFront, Netlify, Vercel, etc.)
```

## Backend Deployment

### Option A: Via Docker Compose
The backend starts via `backend/start.sh` which:
1. Checks for `.env` (creates from `.env.example` if missing).
2. Waits for PostgreSQL to be ready.
3. Waits for Redis to be ready.
4. Runs `alembic upgrade head` for database migrations.
5. Starts `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### Option B: Standalone (bare metal / VM)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with production values
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Option C: Systemd service
Create `/etc/systemd/system/freeledger-backend.service`:
```ini
[Unit]
Description=FreeLedger Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=freeledger
WorkingDirectory=/opt/freeledger/backend
Environment=PYTHONPATH=/opt/freeledger/backend
ExecStart=/opt/freeledger/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## IPFS Deployment

### Via Docker Compose
The docker-compose deploys `ipfs/kubo:v0.28.0` with the `server` profile. It uses a custom init script at `docker/ipfs/config.sh` and persists data in a named volume.

### Production Considerations
- Pin critical content with the IPFS API (`/api/v0/pin/add`).
- The backend has a built-in repin service (`REPIN_INTERVAL_SECONDS`, default 6 hours).
- For high availability, run multiple IPFS nodes or use a dedicated IPFS pinning service (Pinata, web3.storage, etc.).
- Set `IPFS_PROFILE=server` (already configured).

## Smart Contract Deployment

### Local Development (Hardhat)
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat node --hostname 0.0.0.0 &
npx hardhat run scripts/deploy.js --network localhost
```
Then set `CONTRACT_ADDRESS` to the deployed address in `.env`.

### Testnet / Mainnet
1. Configure network in `contracts/hardhat.config.js`:
```javascript
module.exports = {
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/<project-id>",
      accounts: ["<deployer-private-key>"]
    }
  }
};
```
2. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
3. Set `CONTRACT_ADDRESS`, `RPC_URL`, and `CHAIN_ID` in the backend environment.
4. Restart the backend.

## SSL / TLS

### Option A: Reverse Proxy (Recommended)
Run nginx, Caddy, or Traefik in front of the stack:
```nginx
server {
    listen 443 ssl;
    server_name app.freeledger.example.com;

    ssl_certificate /etc/letsencrypt/live/app.freeledger.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.freeledger.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;  # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000;  # Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B: Let's Encrypt (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d app.freeledger.example.com
```

## Monitoring & Logging

### Health Checks
Built-in Docker health checks for every service:
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **Backend**: (add to docker-compose with `curl -f http://localhost:8000/health`)
- **Frontend**: `wget --spider http://localhost/`

### Logging
- All services log to stdout (Docker-native).
- Set `LOG_LEVEL` per environment: `DEBUG` (dev), `INFO` (staging), `WARNING` (production).
- Forward logs with Docker drivers (json-file, journald, awslogs, fluentd).
- Use Loki + Grafana or ELK stack for centralized log aggregation.

### Metrics
- Uvicorn exposes Prometheus metrics through `uvicorn.metrics` (enable via config).
- Monitor: request rate, error rate, latency (p50/p95/p99), PostgreSQL connections, Redis memory.

## Backup & Recovery

### PostgreSQL
```bash
# Backup
docker exec freeledger-postgres pg_dump -U freeledger freeledger > freeledger_backup_$(date +%Y%m%d).sql

# Restore
cat freeledger_backup.sql | docker exec -i freeledger-postgres psql -U freeledger freeledger
```

### Redis
```bash
# Trigger RDB save
docker exec freeledger-redis redis-cli SAVE

# Copy snapshot
docker cp freeledger-redis:/data/dump.rdb ./redis_backup.rdb
```

### IPFS
IPFS data is ephemeral by design. Critical content should be pinned externally (Pinata, web3.storage). The backend repin service periodically re-pins active contract terms and deliverables.

### Volumes
Docker named volumes are used for persistence:
- `postgres_data` — database files
- `redis_data` — Redis RDB/AOF files
- `ipfs_data` — IPFS repository

To back up volumes:
```bash
docker run --rm -v postgres_data:/source -v /backup:/target alpine tar czf /target/postgres_data.tar.gz -C /source .
```

## Troubleshooting

### Backend won't start
1. Check `docker compose logs backend`.
2. Ensure PostgreSQL and Redis are healthy (`docker compose ps`).
3. Verify `.env` exists and has correct values.
4. Run `alembic upgrade head` manually.

### Blockchain operations fail
1. Verify `RPC_URL` is accessible.
2. Verify `CLIENT_PRIVATE_KEY` is set.
3. Verify `CONTRACT_ADDRESS` is set (deploy the contract first).
4. Check `CHAIN_ID` matches the target network.
5. Look for `BLOCKCHAIN_NO_KEY` errors in logs.

### IPFS operations fail
1. Verify `IPFS_API_URL` is accessible.
2. Ensure the IPFS container is running and healthy.
3. Check for disk space (IPFS can consume significant storage).

### CORS errors in frontend
1. Verify `CORS_ORIGINS` in the backend env includes the frontend domain.
2. If using Docker Compose, the nginx proxy handles `/api/` — no CORS needed.

### JWT token issues
1. Verify `JWT_SECRET` matches between token creation and verification.
2. For key rotation: add old secrets to `JWT_SECRETS` (comma-separated).
3. Check `ACCESS_TOKEN_EXPIRE_MINUTES` and `REFRESH_TOKEN_EXPIRE_DAYS`.

## Security Checklist

- [ ] `JWT_SECRET` changed from default (generate with `secrets.token_urlsafe(32)`)
- [ ] PostgreSQL password changed from default `freeledger_dev`
- [ ] Redis password set (via `REDIS_URL: redis://:password@...`)
- [ ] `CLIENT_PRIVATE_KEY` and `FREELANCER_PRIVATE_KEY` from secret manager, never in env files
- [ ] `CONTRACT_ADDRESS` set to deployed production contract
- [ ] `RPC_URL` points to production or testnet endpoint
- [ ] `CORS_ORIGINS` restricted to actual frontend domain(s)
- [ ] `LOG_LEVEL` set to `INFO` or `WARNING` in production
- [ ] SSL/TLS enabled on reverse proxy
- [ ] Docker containers run as non-root (if using rootless Docker)
- [ ] Database backups configured and tested
- [ ] Smart contract audited before mainnet deployment

## Deployment Verification

After deploying, verify the system is operational:

```bash
# Check all services are running
docker compose ps

# Test backend health
curl http://localhost:8000/api/v1/health
# Expected: {"status": "ok", ...}

# Test frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# Test user registration (JWT flow)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
# Expected: 201 with user data + tokens

# Verify API docs are accessible
curl http://localhost:8000/docs
# Expected: 200 (Swagger UI HTML)
```
