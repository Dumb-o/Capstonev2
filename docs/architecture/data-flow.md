# FreeLedger — Data Flow Architecture

## System Layers

```
┌─────────────────────────────────────────────┐
│              Client Layer                    │
│   React App  ←→  MetaMask (Wallet)          │
│   ethers.js  ←→  IPFS Gateway               │
└──────────────────┬──────────────────────────┘
                   │ REST API (JWT Auth)
                   ▼
┌─────────────────────────────────────────────┐
│          Orchestration Layer                │
│         FastAPI (Async + Pydantic)          │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │ Auth    │  │ Contract│  │ Workflow   │  │
│  │ Service │  │ Service │  │ Engine     │  │
│  └────┬────┘  └────┬────┘  └──────┬─────┘  │
│       │            │              │         │
│       ▼            ▼              ▼         │
│  ┌─────────────────────────────────────┐   │
│  │        Redis (Session Cache)        │   │
│  └─────────────────────────────────────┘   │
└──────┬───────────────┬───────────────┬──────┘
       │               │               │
       ▼               ▼               ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ PostgreSQL │ │  IPFS/Kubo │ │  Hardhat Node  │
│ (Metadata) │ │ (Files)    │ │ (Blockchain)   │
│ users      │ │ contracts  │ │ Smart Contracts│
│ jobs       │ │ deliverables│ │ Escrow Logic   │
│ contracts  │ │           │ │ Events         │
│ milestones │ └────────────┘ └────────────────┘
│ disputes   │
│ messages   │
└────────────┘
```

---

## Key Data Flows

### 1. Authentication Flow ("Digital Wax Seal")

```
User                   Frontend               Backend                 Redis
 │                       │                       │                      │
 │  1. Connect Wallet    │                       │                      │
 ├──────────────────────►│                       │                      │
 │                       │  2. GET /challenge     │                      │
 │                       ├──────────────────────►│                      │
 │                       │                       │  3. Store nonce      │
 │                       │                       ├─────────────────────►│
 │                       │  4. { nonce }         │                      │
 │                       │◄──────────────────────┤                      │
 │  5. Sign nonce via    │                       │                      │
 │     MetaMask          │                       │                      │
 │◄──────────────────────┤                       │                      │
 │  6. { signature }     │                       │                      │
 ├──────────────────────►│  7. POST /login       │                      │
 │                       ├──────────────────────►│                      │
 │                       │                       │  8. Verify ECDSA     │
 │                       │                       │     recover address  │
 │                       │                       │  9. Delete nonce     │
 │                       │                       ├─────────────────────►│
 │                       │                       │  10. Store refresh   │
 │                       │                       ├─────────────────────►│
 │                       │  11. { JWT, user }    │                      │
 │                       │◄──────────────────────┤                      │
 │  12. Store JWT        │                       │                      │
 │◄──────────────────────┤                       │                      │
```

### 2. Contract Creation Flow

```
Client                Frontend               Backend                 IPFS           Blockchain
 │                       │                       │                      │               │
 │  1. Fill form         │                       │                      │               │
 ├──────────────────────►│                       │                      │               │
 │                       │  2. POST /contracts   │                      │               │
 │                       ├──────────────────────►│                      │               │
 │                       │                       │  3. Upload terms     │               │
 │                       │                       ├─────────────────────►│               │
 │                       │                       │  4. CID              │               │
 │                       │                       │◄─────────────────────┤               │
 │                       │                       │  5. Store metadata   │               │
 │                       │                       │     in PostgreSQL    │               │
 │                       │                       │                      │               │
 │                       │                       │  6. Deploy escrow    │               │
 │                       │                       ├────────────────────────────────────►│
 │                       │                       │  7. Contract address │               │
 │                       │                       │◄────────────────────────────────────┤
 │                       │                       │  8. Save on_chain_id │               │
 │                       │  9. { contract }      │                      │               │
 │                       │◄──────────────────────┤                      │               │
 │  10. Sign via         │                       │                      │               │
 │      MetaMask         │                       │                      │               │
 │◄──────────────────────┤                       │                      │               │
 │  11. { signature }    │                       │                      │               │
 ├──────────────────────►│  12. POST             │                      │               │
 │                       │      /contracts/{id}  │                      │               │
 │                       │      /sign            │                      │               │
 │                       ├──────────────────────►│                      │               │
 │                       │                       │  13. Call blockchain │               │
 │                       │                       ├────────────────────────────────────►│
 │                       │                       │  14. Status update   │               │
 │                       │  15. Updated contract │                      │               │
 │                       │◄──────────────────────┤                      │               │
```

### 3. Milestone Submission & Payment Flow

```
Freelancer            Frontend               Backend                 IPFS           Blockchain
 │                       │                       │                      │               │
 │  1. Upload file       │                       │                      │               │
 ├──────────────────────►│                       │                      │               │
 │                       │  2. POST /ipfs/upload │                      │               │
 │                       ├──────────────────────►│                      │               │
 │                       │                       │  3. Pin to IPFS      │               │
 │                       │                       ├─────────────────────►│               │
 │                       │                       │  4. CID              │               │
 │                       │                       │◄─────────────────────┤               │
 │                       │  5. { cid }           │                      │               │
 │                       │◄──────────────────────┤                      │               │
 │  6. Confirm submit    │                       │                      │               │
 │◄──────────────────────┤                       │                      │               │
 │                       │  7. POST milestone    │                      │               │
 │                       │     /submit           │                      │               │
 │                       ├──────────────────────►│                      │               │
 │                       │                       │  8. Validate CID     │               │
 │                       │                       │  9. Update DB        │               │
 │                       │ 10. { milestone }     │                      │               │
 │                       │◄──────────────────────┤                      │               │
 │                       │                       │                      │               │
Client                  │                       │                      │               │
 │                       │  11. Review           │                      │               │
 │◄──────────────────────┤                       │                      │               │
 │  12. Approve          │                       │                      │               │
 ├──────────────────────►│ 13. POST milestone    │                      │               │
 │                       │     /approve          │                      │               │
 │                       ├──────────────────────►│                      │               │
 │                       │                       │ 14. call release()   │               │
 │                       │                       ├────────────────────────────────────►│
 │                       │                       │ 15. Tx hash          │               │
 │                       │                       │◄────────────────────────────────────┤
 │                       │                       │ 16. Update DB        │               │
 │                       │ 17. { tx_hash }       │  "paid"              │               │
 │                       │◄──────────────────────┤                      │               │
```

### 4. Blockchain Event Listener (Background)

```
Backend Worker                              Hardhat Node (Blockchain)
     │                                            │
     │  Poll: getPastLogs(contract, event)         │
     ├───────────────────────────────────────────►│
     │  [PaymentReleased(jobId, milestoneIdx)]    │
     │◄───────────────────────────────────────────┤
     │                                            │
     │  UPDATE milestones SET status='paid'       │
     │  WHERE contract_id=? AND index=?           │
     │                                            │
     │  Poll: getPastLogs(contract, event)         │
     ├───────────────────────────────────────────►│
     │  [DisputeRaised(jobId, party)]             │
     │◄───────────────────────────────────────────┤
     │                                            │
     │  UPDATE contracts SET status='disputed'    │
     │  WHERE on_chain_id=?                       │
```

---

## State Machine: Contract Status

```
             ┌──────────┐
             │  DRAFT   │
             └────┬─────┘
                  │ (both parties sign)
                  ▼
          ┌───────────────┐
          │ PENDING_SIGS  │
          └───────┬───────┘
                  │ (all signatures collected)
                  ▼
           ┌──────────┐
           │  ACTIVE  │◄────┐
           └────┬─────┘     │
       ┌────────┼────────┐  │
       ▼        ▼        ▼  │
   SUBMITTED  APPROVED   │  │
       │        │        │  │
       └───┬────┘        │  │
           ▼             │  │
        ┌─────────┐      │  │
        │COMPLETED│      │  │
        └─────────┘      │  │
                         │  │
                    ┌──────────┐
                    │ DISPUTED │
                    └────┬─────┘
                         │ (admin resolves)
                     ┌───┴────┐
                     ▼        ▼
                ┌────────┐ ┌────────┐
                │REFUNDED│ │ RELEASED│
                └────────┘ └────────┘
```

---

## State Machine: Milestone Status

```
  ┌─────────┐
  │ PENDING │
  └────┬────┘
       │ (freelancer submits deliverable)
       ▼
  ┌───────────┐
  │ SUBMITTED │◄────────┐
  └─────┬─────┘         │
        │ (client reviews)│
   ┌────┴────┐          │
   ▼         ▼          │
APPROVED  REJECTED──────┘
   │
   │ (payment released via smart contract)
   ▼
  ┌───────┐
  │  PAID │
  └───────┘
```

---

## Database Table Relationships

```
users 1───* jobs              (client creates jobs)
users 1───* proposals         (freelancer submits proposals)
users 1───* contracts          (as client OR freelancer)
users 1───* messages           (as sender OR receiver)
users 1───* disputes           (as raiser)
users 1───* milestones         (via contracts)

jobs 1───* proposals
jobs 1───0..1 contracts        (optional — a contract may not originate from a job)

contracts 1───* milestones
contracts 1───0..1 disputes

milestones 0..1───1 deliverables (via CID reference)
```

---

## Privacy Architecture

```
User's MetaMask Address
         │
         ▼
  SHA-256(addr + salt)
         │
         ▼
  ┌──────────────────┐
  │ Pseudonymous ID  │ ← stored in PostgreSQL
  │ e.g. "usr_abc123"│
  └──────────────────┘

  Wallet address is NEVER stored in the database.
  It is only held in-memory during the request (JWT claim).
  Address recovery happens via ECDSA on every login.
```
