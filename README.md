<<<<<<< HEAD
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

### Setup

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
uvicorn app.main:app --reload

# 4. Frontend
cd frontend
npm install
npm start
```

### Ports

| Service | Port |
|---|---|
| Frontend | 3000 |
| Backend API | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| IPFS API | 5001 |
| IPFS Gateway | 8080 |
| Hardhat Node | 8545 |

## Sprint Plan

See [docs/plans/sprint-plans.md](docs/plans/sprint-plans.md)

## API Documentation

Once running, visit `http://localhost:8000/docs` for auto-generated OpenAPI docs.

## License

Academic project — Taylors University, Malaysia
>>>>>>> f912268 (I wish you guys luck)
