"""Infraestrutura dos testes.

Os testes de integração precisam de um Postgres de verdade — as consultas usam JSONB,
`mode() WITHIN GROUP`, `FILTER` e `timezone()`, que só existem lá. Em vez de exigir
um servidor instalado, subimos o pglite (Postgres em WASM) com um adaptador de socket;
ver `tests/pgtest/`. Se o Node ou as dependências não estiverem disponíveis, os testes
de integração são pulados e os unitários continuam rodando.
"""

import os
import subprocess
import time
from collections.abc import Iterator
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures"
PGTEST = Path(__file__).parent / "pgtest"

PORTA_PG = 55532
TIMEOUT_BOOT = 90


def _esperar_pronto(processo: subprocess.Popen, timeout: float) -> str | None:
    """Espera a linha `PRONTO` no stdout do servidor.

    Não sondamos a porta com um socket: o pglite-socket aceita **uma** conexão por vez
    e um TCP cru, sem handshake de Postgres, ocupa esse slot — a suíte inteira trava
    esperando uma conexão que nunca é liberada.
    """
    limite = time.time() + timeout
    while time.time() < limite:
        if processo.stdout is None:
            return "servidor sem stdout"
        linha = processo.stdout.readline()
        if not linha:
            return "servidor encerrou antes de ficar pronto"
        if linha.strip() == "PRONTO":
            return None
        if linha.startswith("ERRO"):
            return linha.strip()
    return "tempo limite excedido"


def _gerar_schema_sql() -> Path:
    """DDL a partir de `app/models.py` — o schema dos testes nunca diverge do código."""
    from sqlalchemy.dialects import postgresql
    from sqlalchemy.schema import CreateIndex, CreateTable

    from app.models import Base

    dialeto = postgresql.dialect()
    partes = []

    tipos: dict[str, list[str]] = {}
    for tabela in Base.metadata.tables.values():
        for coluna in tabela.columns:
            if hasattr(coluna.type, "enums"):
                tipos[coluna.type.name] = list(coluna.type.enums)
    for nome, valores in tipos.items():
        valores_sql = ", ".join(repr(v) for v in valores)
        partes.append(f"CREATE TYPE {nome} AS ENUM ({valores_sql});")

    for tabela in Base.metadata.sorted_tables:
        partes.append(str(CreateTable(tabela).compile(dialect=dialeto)).strip() + ";")
        for indice in tabela.indexes:
            partes.append(str(CreateIndex(indice).compile(dialect=dialeto)).strip() + ";")

    destino = FIXTURES / "schema.sql"
    destino.write_text("\n".join(partes) + "\n", encoding="utf-8")
    return destino


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    """Sobe o Postgres de teste e devolve a URL. Pula a sessão se não for possível."""
    url_externa = os.getenv("PAVE_TEST_DATABASE_URL")
    if url_externa:
        yield url_externa
        return

    if not (PGTEST / "node_modules").is_dir():
        pytest.skip("dependências do pglite ausentes — rode: npm install --prefix tests/pgtest")

    schema = _gerar_schema_sql()
    subprocess.run(
        ["python3", str(FIXTURES / "gerar_documentos.py")], check=True, capture_output=True
    )

    processo = subprocess.Popen(
        [
            "node", str(PGTEST / "server.mjs"), str(PORTA_PG),
            str(schema), str(FIXTURES / "seed.sql"), str(FIXTURES / "documentos.sql"),
        ],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )

    erro = _esperar_pronto(processo, TIMEOUT_BOOT)
    if erro:
        processo.kill()
        pytest.skip(f"pglite não subiu: {erro}")

    try:
        yield f"postgresql+asyncpg://postgres@127.0.0.1:{PORTA_PG}/postgres"
    finally:
        processo.kill()
        processo.wait(timeout=10)


@pytest.fixture(scope="session")
def client(request):
    """Cliente HTTP para os testes de endpoint.

    Duas formas, com a mesma interface (`.get(path, params=...)`):

    - `PAVE_TEST_API_URL` apontando para uma API já no ar → httpx contra ela. É o modo
      preferido quando o banco de teste é o pglite: ele aceita uma conexão por vez e
      fica inutilizável depois de uma tentativa malsucedida, então concentrar todo o
      acesso num único processo (a API) evita o problema.
    - senão, sobe a própria aplicação em processo com o TestClient.
    """
    url_api = os.getenv("PAVE_TEST_API_URL")
    if url_api:
        import httpx

        with httpx.Client(base_url=url_api.rstrip("/"), timeout=30) as c:
            yield c
        return

    database_url = request.getfixturevalue("database_url")
    os.environ["PAVE_DATABASE_URL"] = database_url
    os.environ["PAVE_AUTH_DISABLED"] = "true"
    os.environ["PAVE_DB_POOL_SIZE"] = "1"
    os.environ["PAVE_DB_MAX_OVERFLOW"] = "0"
    os.environ.setdefault("PAVE_DB_SSL", "disable")

    from app.config import get_settings

    get_settings.cache_clear()

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def periodo() -> dict[str, str]:
    """Janela que cobre toda a carga de teste (agosto de 2026)."""
    return {"from": "2026-08-01", "to": "2026-08-30"}
