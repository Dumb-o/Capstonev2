# FreeLedger — A Decentralized Freelance Protocol with Web3 Integration

Hybrid Web3 freelancing platform connecting clients and freelancers via Ethereum smart contracts, IPFS decentralized storage, and MetaMask wallet authentication.

## Team

| Name | Role | Email |
|---|---|---|
| Sarun Mahrajan | Project Manager / Backend & Blockchain Developer | sarun2080-0228@iimscollege.edu.np |
| Bijee Dangol | Frontend Developer | bijee2080-212@iimscollege.edu.np |
| Pawan Poudel | Backend, Database & Storage Specialist | pawan2080-0296@iimscollege.edu.np |
| Anushree Pradhan | Backend, API Developer, Database Assistant | anushree2080-0344@iimscollege.edu.np |
| Runa Maphu | System Workflow Engineer, Junior Backend Developer | runa2080-0189@iimscollege.edu.np |

**Supervisor**: Subit Timalsina

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, ethers.js 6, Axios |
| Backend | FastAPI (Python), SQLAlchemy, Alembic |
| Database | PostgreSQL 15, Redis 7 |
| Storage | IPFS (Kubo v0.28) |
| Blockchain | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Wallet | MetaMask |

## Architecture

```
Frontend (React + ethers.js)
    │ REST API (JWT Auth)
    ▼
Backend (FastAPI + Web3.py)
    │                │                │
    ▼                ▼                ▼
PostgreSQL      IPFS/Kubo      Hardhat Node
(Metadata)      (Files)        (Escrow Contracts)
    │                │                │
    └────────────────┴────────────────┘
              Redis (Session Cache)
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.10+
- MetaMask browser extension

### Quick Setup (One Command)

```bash
bash scripts/setup-dev.sh
```

Then start the servers:

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend && npm start
```

### Manual Setup

```bash
# 1. Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# 2. Smart contracts
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost

# 3. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed_wallets   # Pre-create wallet-based users
uvicorn app.main:app --reload

# 4. Frontend
cd frontend
npm install
npm start
```

### Wallet Setup

FreeLedger uses **two separate MetaMask wallets** for local development:

| Role | Wallet Address | Private Key |
|------|---------------|-------------|
| Client | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Freelancer | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |

See [docs/local-wallet-setup.md](docs/local-wallet-setup.md) for full setup and testing instructions.

### Ports

| Service | Port | Protocol |
|---|---|---|
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
| IPFS API | 5001 | HTTP |
| IPFS Gateway | 8080 | HTTP |
| Backend API | 3001 | HTTP |
| Backend Docs | 8001 | HTTP |
| Frontend Dev | 3000 | HTTP |
| Hardhat Node | 8545 | HTTP |
| Hardhat WS | 8546 | WebSocket |

## Sprint Plan

See [docs/plans/sprint-plans.md](docs/plans/sprint-plans.md)

## API Documentation

Once running, visit `http://localhost:8000/docs` for auto-generated OpenAPI docs.

## License

Academic project — Taylors University, Malaysia
