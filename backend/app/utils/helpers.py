import hashlib
import os


def generate_pseudonymous_id(wallet_address: str) -> str:
    salt = os.urandom(16).hex()
    hash_input = f"{wallet_address.lower()}:{salt}"
    hashed = hashlib.sha256(hash_input.encode()).hexdigest()[:12]
    return f"usr_{hashed}"


def pagination_params(page: int = 1, limit: int = 20) -> tuple[int, int]:
    page = max(1, page)
    limit = min(100, max(1, limit))
    offset = (page - 1) * limit
    return offset, limit
