from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://freeledger:freeledger_dev@localhost:5432/freeledger"
    database_url_sync: str = "postgresql://freeledger:freeledger_dev@localhost:5432/freeledger"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-this-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337
    contract_address: str | None = None
    ipfs_api_url: str = "http://127.0.0.1:5001"
    platform_fee_bps: int = 250
    client_private_key: str = ""
    freelancer_private_key: str = ""
    hardhat_account_index: int = 0
    repin_interval_seconds: int = 21600
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
    ]
    blockchain_timeout: int = 30
    blockchain_tx_timeout: int = 120
    log_level: str = "DEBUG"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
