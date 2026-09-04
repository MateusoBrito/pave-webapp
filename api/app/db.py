"""Conexão com o Postgres.

Só o engine e a sessão — o mapeamento das tabelas entra quando o schema real chegar
(ver db/schema.sql).
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import Settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def init_engine(settings: Settings) -> None:
    global _engine, _session_factory
    connect_args: dict[str, object] = {}
    if settings.db_ssl == "disable":
        connect_args["ssl"] = False
    elif settings.db_ssl:
        connect_args["ssl"] = settings.db_ssl

    _engine = create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def get_session() -> AsyncIterator[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Engine não inicializado — init_engine() roda no lifespan.")
    async with _session_factory() as session:
        yield session
