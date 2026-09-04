"""Configuração por variável de ambiente."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="PAVE_", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/pave"
    db_pool_size: int = 10
    db_max_overflow: int = 5
    db_ssl: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]

    firebase_credentials_file: str = ""
    auth_disabled: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
