# FreeLedger Security Architecture

## Private Key Management

### Current Architecture (MB-006)

FreeLedger uses two environment variables for blockchain transaction signing:

| Variable | Role | Used For |
|---|---|---|
| `CLIENT_PRIVATE_KEY` | PRIMARY signing key | Contract creation, funding, milestone approval, dispute initiation, dispute resolution |
| `FREELANCER_PRIVATE_KEY` | Secondary signing key | Milestone submission only (falls back to `CLIENT_PRIVATE_KEY`) |

#### Key Resolution Hierarchy

```
create_contract:      param > CLIENT_PRIVATE_KEY
fund_contract:        param > CLIENT_PRIVATE_KEY
submit_milestone:     param > FREELANCER_PRIVATE_KEY > CLIENT_PRIVATE_KEY
approve_milestone:    param > CLIENT_PRIVATE_KEY
raise_dispute:        CLIENT_PRIVATE_KEY (direct)
resolve_dispute:      CLIENT_PRIVATE_KEY (direct)
```

In practice, `CLIENT_PRIVATE_KEY` can sign every operation type. `FREELANCER_PRIVATE_KEY` is optional and only narrows authority for milestone submission.

#### Key Loading

Keys are loaded into memory at the point of first use via `w3.eth.account.from_key(private_key)` in `blockchain_service.py`. There is no key caching beyond the Python variable scope of each function call. The `Web3` instance and contract object are cached module-globally, but the key material itself is re-derived from the environment variable on each call.

### Risk Assessment (MB-006)

| Category | Risk Level | Description |
|---|---|---|
| **Confidentiality** | **Critical** | A single `CLIENT_PRIVATE_KEY` compromises all escrowed funds. Attacker with key access can drain every contract. |
| **Integrity** | **Critical** | Same key can create, fund, approve, dispute, and resolve — no separation of duties. A malicious or compromised operator can perform any action. |
| **Availability** | **High** | If `CLIENT_PRIVATE_KEY` is lost or not configured, all blockchain operations fail. The Docker Compose setup does not set either key by default. |

#### Blast Radius

One compromised key = all active escrow contracts compromised. The smart contract escrow (`GigEscrow.sol`) holds real ETH value. There is no per-contract or per-user key isolation.

### Current Suitability

| Environment | Acceptable? | Notes |
|---|---|---|
| Local development (Hardhat) | **Yes** | Test accounts with play ETH. Keys are public Hardhat defaults. |
| Testnet (Sepolia) | **Conditional** | Only if test ETH has no real value and key is scoped to a test-only deployer account. |
| Production (Mainnet) | **No** | Single key is a critical security risk. Requires multi-key or external signer architecture before handling real funds. |

---

## Future Architecture Paths

### Option A: Per-User Signing Model

**Description:** Users sign their own transactions via MetaMask (or similar wallet). The platform never holds private keys.

**Implementation sketch:**
- Contract creation: freelancer and client both sign a shared terms hash
- Funding: client signs the `fundContract` call from their wallet
- Milestone approval: client signs approval from their wallet
- Dispute: either party signs from their wallet
- Resolution: requires admin + one party, or multi-sig

**Tradeoffs:**
- ✅ Eliminates custodial key risk entirely
- ✅ Users retain full control of their funds
- ❌ Requires smart contract redesign (multi-party signing)
- ❌ Frontend must integrate with wallet SDKs (ethers.js, web3-react)
- ❌ UX friction — users must confirm transactions in wallet
- ❌ Gas costs shift to end users

### Option B: External Signer Service (Signing Oracle)

**Description:** Isolated signing service that holds keys and exposes a gated signing API. The backend sends signing requests; the signer validates authority and signs.

**Implementation sketch:**
```python
# Backend sends a signing request
response = await signer_client.request_signature(
    operation="approve_milestone",
    contract_id=42,
    milestone_index=1,
    user_id="usr_abc",
)
```

**Tradeoffs:**
- ✅ Keys isolated from the main application server
- ✅ Signer can enforce per-operation access control
- ✅ Can be scaled and audited independently
- ❌ Adds network hop and latency
- ❌ Signer is still custodial (holds keys on behalf of users)
- ❌ Requires signer service deployment and monitoring

### Option C: Hardware-Backed Key Management (HSM / Cloud KMS)

**Description:** Keys stored in a Hardware Security Module or cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault). Signing operations go through the HSM/KMS API.

**Implementation sketch:**
```python
from eth_account import Account
from eth_signer.kms import KMSBackend

# Key never leaves the HSM
signer = Account.from_key_backend(KMSBackend(key_id="projects/p/..."))
signed_tx = signer.sign_transaction(tx)
```

**Tradeoffs:**
- ✅ Highest security — key material never in application memory
- ✅ Hardware-backed key derivation and signing
- ✅ Cloud KMS provides access logging, rotation, and audit trails
- ❌ Requires cloud provider dependency
- ❌ Slower signing (network round-trip per operation)
- ❌ More complex deployment and cost

### Option D: Threshold Signing / Multi-Sig

**Description:** Requires M-of-N signatures to authorize any escrow operation. For example, client + platform + arbitrator must all sign before a milestone payment is released.

**Tradeoffs:**
- ✅ Highest trust — no single party can act alone
- ✅ Aligns with the decentralized ethos of the platform
- ❌ Smart contract complexity increases significantly
- ❌ UX friction — requires multiple signers to coordinate
- ❌ Dispute resolution becomes slower

### Recommended Path

| Phase | What | Why |
|---|---|---|
| **Now** | Document current risk (this document) | Awareness |
| **Short-term** | Option B (External Signer) | Separates keys from API server; modest engineering effort |
| **Medium-term** | Option A + B hybrid | Users sign their own actions; platform signer handles platform-level operations (dispute resolution, fee collection) |
| **Long-term** | Option D (Multi-sig) for high-value contracts | Aligns with trustless design goals |

---

## Deployment Guidance

### Local Development

```bash
# Hardhat default keys — DO NOT USE WITH REAL FUNDS
CLIENT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FREELANCER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Testnet (Sepolia)

1. Create a dedicated deployer account (not the Hardhat default)
2. Fund it with Sepolia ETH from a faucet
3. Use ONLY this key as `CLIENT_PRIVATE_KEY`
4. Do not reuse this key on mainnet
5. Set `CONTRACT_ADDRESS` to the testnet-deployed contract address

### Production (Mainnet)

**Before deploying to mainnet, address MB-006 by implementing one of the following:**

1. **Minimal**: Use a dedicated key per contract deployment, with the key destroyed or disabled after deployment. Users fund and manage contracts directly from their wallets.
2. **Recommended**: Implement an external signer service (Option B) that validates each signing request against a policy before authorizing.
3. **Ideal**: Architect for per-user signing (Option A) where platform never holds keys that control user funds.

**Operational controls for any production deployment:**
- Rotate keys regularly
- Use a secret manager (AWS Secrets Manager, HashiCorp Vault) — never store keys in environment variables or files
- Enable audit logging for all signing requests
- Set up alerts for unusual signing patterns
- Limit the ETH balance held by the signing key to the minimum required for gas

---

## Related Documentation

- `GAP_ANALYSIS.md` — GAP-12: Private Key Single Point of Failure
- `CAPSTONE_REVIEW.md` — Security assessment scores
- `REQUIREMENTS_AUDIT.md` — NFR-14: Private Key Security
- `sprint-plans.md` — T5: Private key management improvement
- `data-flow.md` — Application data flow and privacy architecture
