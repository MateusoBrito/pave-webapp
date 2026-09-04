"""Aplicação FastAPI do PAVE."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import init_firebase
from .config import get_settings
from .db import dispose_engine, get_session, init_engine
from .routers import ads, catalog, comparison, network_documents, series, topics

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_engine(settings)
    if not settings.auth_disabled:
        init_firebase(settings)
    yield
    await dispose_engine()


app = FastAPI(
    title="PAVE API",
    description="Painel de monitoramento da conversa eleitoral.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", tags=["infra"])
async def health() -> dict[str, str]:
    """Liveness: o processo respondeu. Não toca no banco."""
    return {"status": "ok"}


@app.get("/ready", tags=["infra"])
async def ready(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    """Readiness: o banco responde.

    Separado de `/health` de propósito. Um probe que só confirma que o processo subiu
    deixa entrar tráfego numa instância cujo pool de conexões não está de pé — a
    requisição do usuário é que descobre o problema. Este é o que o balanceador deve
    consultar.
    """
    try:
        await session.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError) as err:
        logger.warning("Readiness falhou: %s", err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Banco indisponível.",
        ) from err
    return {"status": "ready"}


app.include_router(catalog.router)
app.include_router(series.router)
app.include_router(topics.router)
app.include_router(comparison.router)
app.include_router(ads.router)
app.include_router(network_documents.router)
