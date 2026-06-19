import asyncio
import json
import logging
import os
from typing import Any

from web3 import Web3

from app.config import settings
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import BlockchainError

logger = logging.getLogger("freeledger.blockchain_service")

_web3: Web3 | None = None
_contract: Any | None = None


# =============================================================================
# SIGNING AUTHORITY — Private Key Architecture
# =============================================================================
# This module uses raw private keys for all on-chain transaction signing.
# Keys are loaded from environment variables at runtime:
#
#   CLIENT_PRIVATE_KEY       — signs contract creation, funding, milestone
#                              approval, dispute initiation, and dispute
#                              resolution. This is the PRIMARY signing key.
#   FREELANCER_PRIVATE_KEY   — signs milestone submission only. Falls back
#                              to CLIENT_PRIVATE_KEY if not set.
#
# ARCHITECTURAL LIMITATION (MB-006):
#   A single key (CLIENT_PRIVATE_KEY) controls ALL escrow operations:
#   create, fund, approve, dispute, and resolve. If this key is compromised,
#   an attacker can drain all escrow contracts. This is a SINGLE POINT OF
#   FAILURE. The platform is NOT production-ready for custodial key management.
#
#   For local development with Hardhat, these keys correspond to test
#   accounts with play ETH. In production, each signing context SHOULD use
#   distinct keys with the minimum required authority (defense in depth).
#
#   Future options (documented in docs/architecture/security.md):
#     A. Per-user signing (users sign their own transactions)
#     B. External signer service (isolated signing oracle)
#     C. Hardware Security Module (HSM) or cloud KMS
#     D. Threshold signing / multi-sig
# =============================================================================


def get_web3() -> Web3:
    global _web3
    if _web3 is None:
        _web3 = Web3(Web3.HTTPProvider(
            settings.rpc_url,
            request_kwargs={"timeout": settings.blockchain_timeout},
        ))
        if not _web3.is_connected():
            raise BlockchainError(f"Cannot connect to RPC at {settings.rpc_url}", code=ErrorCodes.BLOCKCHAIN_UNAVAILABLE)
    return _web3


def get_contract():
    global _contract
    if _contract is None:
        w3 = get_web3()
        if not settings.contract_address:
            raise BlockchainError("Contract address not configured", code=ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED)

        abi_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "GigEscrow.json")
        if not os.path.exists(abi_path):
            raise BlockchainError(f"ABI file not found at {abi_path}", code=ErrorCodes.BLOCKCHAIN_ABI_NOT_FOUND)

        with open(abi_path) as f:
            contract_json = json.load(f)
            abi = contract_json.get("abi", contract_json)

        _contract = w3.eth.contract(address=settings.contract_address, abi=abi)
    return _contract


async def _run_sync(fn, *args, **kwargs):
    try:
        return await asyncio.to_thread(fn, *args, **kwargs)
    except BlockchainError:
        raise
    except Exception as exc:
        from requests.exceptions import ConnectionError as ReqConnErr
        from requests.exceptions import Timeout as ReqTimeout

        if isinstance(exc, ReqTimeout):
            logger.warning("Blockchain RPC request timed out after %ss", settings.blockchain_timeout)
            raise BlockchainError("Blockchain RPC is not responding", code=ErrorCodes.BLOCKCHAIN_TIMEOUT) from exc
        if isinstance(exc, ReqConnErr):
            logger.warning("Blockchain RPC connection refused at %s", settings.rpc_url)
            raise BlockchainError(f"Cannot connect to blockchain RPC at {settings.rpc_url}", code=ErrorCodes.BLOCKCHAIN_UNAVAILABLE) from exc
        logger.error("Blockchain RPC error: %s", exc)
        raise BlockchainError("Blockchain operation failed", code=ErrorCodes.BLOCKCHAIN_ERROR) from exc


async def deploy_contract(client_address: str, private_key: str) -> dict:
    w3 = get_web3()
    abi_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "GigEscrow.json")
    with open(abi_path) as f:
        contract_json = json.load(f)
        abi = contract_json["abi"]
        bytecode = contract_json["bytecode"]

    account = w3.eth.account.from_key(private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.constructor().build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 3000000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)

    return {
        "contract_address": receipt.contractAddress,
        "tx_hash": tx_hash.hex(),
    }


async def create_contract_on_chain(
    freelancer_address: str,
    title: str,
    terms_cid: str,
    total_amount_wei: int,
    deadline: int,
    milestone_descs: list[str],
    milestone_amounts: list[int],
    client_private_key: str,
) -> dict:
    if not freelancer_address:
        raise BlockchainError(
            "Freelancer wallet address is required for on-chain contract creation",
            code=ErrorCodes.VALIDATION_ERROR,
        )
    w3 = get_web3()
    try:
        freelancer_address = w3.to_checksum_address(freelancer_address)
    except Exception as exc:
        raise BlockchainError(
            f"Invalid freelancer wallet address: {freelancer_address}",
            code=ErrorCodes.BLOCKCHAIN_ERROR,
        ) from exc
    contract = get_contract()
    account = w3.eth.account.from_key(client_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    try:
        tx = contract.functions.createContract(
            freelancer_address, title, terms_cid, total_amount_wei, deadline,
            milestone_descs, milestone_amounts
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 500000,
            "gasPrice": gas_price,
        })
    except Exception as exc:
        logger.error("Failed to build contract creation tx: %s", exc)
        raise BlockchainError(
            "Failed to build contract creation transaction",
            code=ErrorCodes.BLOCKCHAIN_ERROR,
        ) from exc
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)

    try:
        contract_id_log = contract.events.ContractCreated().process_receipt(receipt)
        on_chain_id = contract_id_log[0]["args"]["contractId"] if contract_id_log else None
    except Exception as exc:
        logger.error("Failed to process contract creation receipt: %s", exc)
        raise BlockchainError(
            "Failed to process contract creation receipt",
            code=ErrorCodes.BLOCKCHAIN_ERROR,
        ) from exc

    return {
        "on_chain_id": on_chain_id,
        "tx_hash": tx_hash.hex(),
        "contract_address": settings.contract_address,
    }


async def fund_contract_on_chain(
    contract_id: int,
    amount_wei: int,
    client_private_key: str,
) -> str:
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(client_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.functions.fundContract(contract_id).build_transaction({
        "from": account.address,
        "value": amount_wei,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)
    return tx_hash.hex()


async def submit_milestone_on_chain(
    contract_id: int,
    milestone_index: int,
    deliverable_cid: str,
    freelancer_private_key: str,
) -> str:
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(freelancer_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.functions.submitMilestone(contract_id, milestone_index, deliverable_cid).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)
    return tx_hash.hex()


async def approve_milestone_on_chain(
    contract_id: int,
    milestone_index: int,
    client_private_key: str,
) -> str:
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(client_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.functions.approveMilestone(contract_id, milestone_index).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)
    return tx_hash.hex()


async def raise_dispute_on_chain(
    contract_id: int,
    initiator_private_key: str,
) -> str:
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(initiator_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.functions.raiseDispute(contract_id).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)
    return tx_hash.hex()


async def resolve_dispute_on_chain(
    contract_id: int,
    decision: str,
    admin_private_key: str,
) -> str:
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(admin_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    fn = contract.functions.refundDispute if decision == "refund" else contract.functions.releasePayment
    tx = fn(contract_id).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.rawTransaction)
    await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash, timeout=settings.blockchain_tx_timeout)
    return tx_hash.hex()


def get_contract_state(on_chain_id: int) -> dict:
    try:
        contract = get_contract()
        details = contract.functions.getContractDetails(on_chain_id).call()
        return {
            "client": details[0],
            "freelancer": details[1],
            "title": details[2],
            "status": details[5],
            "milestone_count": details[6],
            "completed_milestones": details[7],
        }
    except BlockchainError:
        raise
    except Exception as exc:
        from requests.exceptions import ConnectionError as ReqConnErr
        from requests.exceptions import Timeout as ReqTimeout

        if isinstance(exc, (ReqTimeout, ReqConnErr)):
            logger.warning("get_contract_state(%s) timed out after %ss", on_chain_id, settings.blockchain_timeout)
            raise BlockchainError("Blockchain RPC is not responding", code=ErrorCodes.BLOCKCHAIN_TIMEOUT) from exc
        logger.error("get_contract_state(%s) failed: %s", on_chain_id, exc)
        raise BlockchainError("Blockchain operation failed", code=ErrorCodes.BLOCKCHAIN_ERROR) from exc


def get_eth_balance(address: str) -> float:
    try:
        w3 = get_web3()
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(address))
        return float(Web3.from_wei(balance_wei, "ether"))
    except BlockchainError:
        raise
    except Exception as exc:
        from requests.exceptions import ConnectionError as ReqConnErr
        from requests.exceptions import Timeout as ReqTimeout

        if isinstance(exc, (ReqTimeout, ReqConnErr)):
            logger.warning("get_eth_balance(%s) timed out after %ss", address, settings.blockchain_timeout)
            raise BlockchainError("Blockchain RPC is not responding", code=ErrorCodes.BLOCKCHAIN_TIMEOUT) from exc
        logger.error("get_eth_balance(%s) failed: %s", address, exc)
        raise BlockchainError("Blockchain operation failed", code=ErrorCodes.BLOCKCHAIN_ERROR) from exc


def to_wei(eth_amount: float) -> int:
    return Web3.to_wei(eth_amount, "ether")


def from_wei(wei_amount: int) -> float:
    return float(Web3.from_wei(wei_amount, "ether"))


def calculate_fee(amount_wei: int, fee_bps: int = None) -> int:
    if fee_bps is None:
        fee_bps = settings.platform_fee_bps
    return (amount_wei * fee_bps) // 10000
