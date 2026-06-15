import asyncio
import json
import os
from typing import Any

from web3 import Web3

from app.config import settings
from app.utils.exceptions import BlockchainError

_web3: Web3 | None = None
_contract: Any | None = None


def get_web3() -> Web3:
    global _web3
    if _web3 is None:
        _web3 = Web3(Web3.HTTPProvider(settings.rpc_url))
        if not _web3.is_connected():
            raise BlockchainError(f"Cannot connect to RPC at {settings.rpc_url}")
    return _web3


def get_contract():
    global _contract
    if _contract is None:
        w3 = get_web3()
        if not settings.contract_address:
            raise BlockchainError("Contract address not configured")

        abi_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "GigEscrow.json")
        if not os.path.exists(abi_path):
            raise BlockchainError(f"ABI file not found at {abi_path}")

        with open(abi_path) as f:
            contract_json = json.load(f)
            abi = contract_json.get("abi", contract_json)

        _contract = w3.eth.contract(address=settings.contract_address, abi=abi)
    return _contract


async def _run_sync(fn, *args, **kwargs):
    return await asyncio.to_thread(fn, *args, **kwargs)


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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)

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
    w3 = get_web3()
    contract = get_contract()
    account = w3.eth.account.from_key(client_private_key)
    nonce = await _run_sync(w3.eth.get_transaction_count, account.address)

    gas_price = await _run_sync(lambda: w3.eth.gas_price)
    tx = contract.functions.createContract(
        freelancer_address, title, terms_cid, total_amount_wei, deadline,
        milestone_descs, milestone_amounts
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": gas_price,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)

    contract_id_log = contract.events.ContractCreated().process_receipt(receipt)
    on_chain_id = contract_id_log[0]["args"]["contractId"] if contract_id_log else None

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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)
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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)
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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)
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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)
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
    tx_hash = await _run_sync(w3.eth.send_raw_transaction, signed_tx.raw_transaction)
    receipt = await _run_sync(w3.eth.wait_for_transaction_receipt, tx_hash)
    return tx_hash.hex()


def get_contract_state(on_chain_id: int) -> dict:
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


def get_eth_balance(address: str) -> float:
    w3 = get_web3()
    balance_wei = w3.eth.get_balance(Web3.to_checksum_address(address))
    return float(Web3.from_wei(balance_wei, "ether"))


def to_wei(eth_amount: float) -> int:
    return Web3.to_wei(eth_amount, "ether")


def from_wei(wei_amount: int) -> float:
    return float(Web3.from_wei(wei_amount, "ether"))


def calculate_fee(amount_wei: int, fee_bps: int = None) -> int:
    if fee_bps is None:
        fee_bps = settings.platform_fee_bps
    return (amount_wei * fee_bps) // 10000
