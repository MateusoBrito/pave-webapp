# Testes da API

```
tests/
  test_unidade.py     regras de negócio, sem banco
  test_integracao.py  endpoints e filtros contra Postgres
  test_coerencia.py   os números de endpoints diferentes precisam concordar entre si
  test_contrato.py    a resposta bate com as interfaces TypeScript do front
  test_front.py       as URLs que o client.ts monta são aceitas pela API
```

## Rodando

Os unitários não precisam de nada:

```bash
.venv/bin/python -m pytest tests/test_unidade.py
```

Os demais precisam de um Postgres com a carga de teste. Três modos, nesta ordem de
preferência:

**1. Contra uma API já no ar** (o mais estável):

```bash
node tests/pgtest/server.mjs 55532 tests/fixtures/schema.sql \
     tests/fixtures/seed.sql tests/fixtures/documentos.sql &

PAVE_DATABASE_URL="postgresql+asyncpg://postgres@127.0.0.1:55532/postgres" \
PAVE_AUTH_DISABLED=true PAVE_DB_POOL_SIZE=1 PAVE_DB_MAX_OVERFLOW=0 PAVE_DB_SSL=disable \
  .venv/bin/uvicorn app.main:app --port 8099 &

PAVE_TEST_API_URL=http://localhost:8099 .venv/bin/python -m pytest tests/
```

**2. Contra um Postgres seu:** carregue os três `.sql` de `fixtures/` e aponte
`PAVE_TEST_DATABASE_URL`. É o modo indicado para CI.

**3. Sem configurar nada:** a suíte tenta subir o pglite sozinha. Funciona, mas o
pglite-socket aceita **uma conexão por vez** e fica inutilizável depois de uma
tentativa malsucedida — qualquer falha contamina o resto da execução.

## Por que pglite

As consultas usam `JSONB`, `mode() WITHIN GROUP`, `FILTER` e `timezone()`: só rodam em
Postgres de verdade. O pglite é o Postgres compilado para WASM, então a suíte não exige
um servidor instalado.

Duas armadilhas, já resolvidas no código mas que voltam se alguém mexer:

- **Versão.** `pglite-socket` 0.2.11 quebra o protocolo do asyncpg 0.31
  (`'NoneType' object has no attribute 'cancelled'`). O par fixado em
  `pgtest/package.json` — 0.1.6 com pglite 0.4.6 — é o testado.
- **TLS.** O asyncpg tenta o upgrade de SSL por padrão e o pglite recusa a negociação
  em vez de responder, o que **trava** a conexão em vez de falhar. Daí `PAVE_DB_SSL=disable`.
  Pela URL (`?ssl=disable`) não resolve: o asyncpg quer o booleano `False`, e a URL
  entrega a string.
- **Prontidão.** Nunca sonde a porta com socket cru para saber se subiu — isso ocupa a
  única conexão. O `conftest` espera a linha `PRONTO` no stdout do servidor.

## A carga de teste

`fixtures/seed.sql` espelha o que o **pave-pipeline** realmente grava, não um banco
idealizado: fonte `meta` (não `meta_ads`), códigos de entidade com underscore,
`alvo_coleta.tipo` sem `alias`, `canal` cru (channel_id/page_id/subreddit sem `r/`),
`metadados` NULL, `sentimento` vazia, `topico.rotulo` NULL.

Cada linha existe para exercitar um caminho: entidade inativa, entidade ativa sem
documentos, alvo de coleta inativo, modelo arquivado, tópico outlier (`numero = -1`),
tópico sem palavras-chave, tópico com rótulo revisado, documento às 23h30 (borda de
fuso), vídeo (que não conta como menção) e documento fora da janela.

`fixtures/documentos.sql` é gerado por `gerar_documentos.py` — determinístico, para as
contagens dos testes serem exatas. Regenere com:

```bash
.venv/bin/python tests/fixtures/gerar_documentos.py
```
