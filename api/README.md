# PAVE API

Backend do painel. Substitui a camada de mocks de `src/api/client.ts` mantendo o
contrato: cada função de lá vira um `fetch` contra o endpoint correspondente, sem
mudança de assinatura, e nenhuma página ou componente do front precisa mudar.

## Rodando

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"        # ou: uv sync
cp .env.example .env           # preencha PAVE_DATABASE_URL
uvicorn app.main:app --reload
```

Docs interativas em http://localhost:8000/docs.

`/health` é liveness (o processo respondeu). `/ready` é readiness (o banco respondeu) —
é este que o balanceador deve consultar: um probe que só confirma que o processo subiu
deixa entrar tráfego numa instância cujo pool de conexões não está de pé.

Sem Firebase configurado, use `PAVE_AUTH_DISABLED=true` para desenvolver — as rotas
protegidas passam a receber um usuário fictício.

## Estrutura

| Arquivo | Papel |
|---|---|
| `app/models.py` | mapeamento das tabelas do Postgres |
| `app/schemas/domain.py` | tipos de domínio — espelham `src/types/` |
| `app/schemas/responses.py` | um modelo por endpoint — espelham as interfaces de `src/api/client.ts` |
| `app/schemas/base.py` | serialização camelCase + omissão de nulos |
| `app/deps.py` | filtros compartilhados e as regras de período/escopo |
| `app/queries/base.py` | junção-base de toda agregação; split de tópico por entidade |
| `app/queries/metadata.py` | **único** ponto que lê `documento.metadados` (JSONB) |
| `app/queries/*.py` | agregações por área |
| `app/routers/*.py` | os 29 endpoints |
| `app/auth.py` | verificação do ID token do Firebase |

## Regras que a API tem que preservar

Estão hoje implementadas nos mocks e definem os números que o painel mostra. Mudar
qualquer uma muda o resultado na tela:

- **Lista vazia significa "todos".** `candidates`, `networks` e `platforms` ausentes
  ou vazios não filtram nada. A exceção está abaixo.
- **Filtrar só Meta Ads devolve vazio**, não "tudo". Como Meta Ads é excluído de
  sentimento e de ranking de tópico, sobra lista vazia — que significaria "todas as
  redes" e faria a tela mostrar o oposto do pedido. `OrganicScope.empty` marca o caso.
- **Meta Ads fora de sentimento e de ranking de tópico.** Anúncio pago é conteúdo do
  próprio candidato, não conversa do público.
- **Variação é sempre contra o período imediatamente anterior de mesma duração**
  (`Period.previous()`).
- **Sentimento é contagem, não proporção.** Soma ao total de menções do objeto a que
  está anexado.
- **Empate de sentimento predominante:** negativo ganha, depois positivo
  (`TopicSentiment.predominant`).
- **Tópico pertence a um candidato só.** Não existe tópico compartilhado — é
  consequência de rodar o BERTopic por corpus de candidato.
- **Autor nunca é exposto** em comentários de thread.

## Duas leituras do schema que valem registrar

**Tópico é partido por entidade.** No banco, `topico → modelo → fonte`: o modelo é
por rede, e um tópico pode conter documentos de mais de um candidato. O front assume
o contrário (`Topic.entityId`, ver `src/types/topic.ts`). Em vez de eleger a entidade
dominante e descartar o resto, cada par (tópico, entidade) vira um tópico do ponto de
vista da API, com id composto `{topico_id}-{entidade_codigo}`. Nada se perde nem se
duplica, e `Topic.weight` — "share of the entity's own documents" — cai naturalmente.

**`video` não é menção.** Vídeo do canal oficial é o container de onde saem os
comentários, não fala do público. Contá-lo inflaria o volume orgânico com conteúdo do
próprio candidato — justamente o que o painel separa em outra tela.

## O que o pipeline realmente produz (pave-pipeline)

A API foi conferida contra `~/Projetos/pave-pipeline`. Divergências que valem estar
escritas, porque não se deduzem do schema:

| Ponto | Realidade no pipeline |
|---|---|
| `fonte.codigo` | `youtube`, `reddit`, **`meta`** — o front usa `meta_ads`; ver `NETWORK_TO_FONTE` |
| `entidade.codigo` | slug com underscore (`flavio_bolsonaro`), de `slugify()` |
| `entidade.partido` / `.foto` | `seed_entidades` não preenche partido; `atualiza_fotos` grava `/fotos/<codigo>.jpg` |
| `alvo_coleta.tipo` | só `canal`, `handle` e `consulta` — **nunca `alias`** |
| `alvo_coleta.canal` | channel_id (YouTube), page_id (Meta), subreddit sem `r/` (Reddit) |
| `documento.metadados` | **sempre NULL** — `load_documentos` não preenche (está no docstring dele) |
| `sentimento` | **vazia** — nenhum pipeline escreve nela |
| `topico.rotulo` / `.revisado` | `load_topicos` só grava `palavras_chave` e `tamanho` |
| `modelo` | um por (fonte, entidade); a entidade fica em `parametros->>'entidade_codigo'` |
| volume | ~441 mil documentos, 97% comentários do YouTube |

## Pendências e riscos conhecidos

1. **`documento.metadados` é NULL em todas as linhas.** `load_documentos.py` diz isso
   no próprio docstring. Consequência direta: `engagement` sempre 0, e a tela "O que
   os candidatos postam?" mostra investimento e impressões zerados — os dados existem
   no MongoDB (`spend`, `impressions`, `ad_creative_bodies`), só não são carregados.
   Toda a leitura do JSONB está isolada em `app/queries/metadata.py`; no dia em que o
   loader preencher a coluna, a tela acende sozinha.
2. **Filtro por plataforma (Facebook/Instagram) não tem fonte de dado.**
   `publisher_platforms` não está nos `FIELDS` do `meta_collector.py` — não é só
   questão de carregar, é preciso coletar antes.
3. **`sentimento` está vazia.** Nenhum pipeline escreve nela. Todo sentimento sai
   0/0/0, o donut e as barras ficam vazios, e `predominant` devolve `neutro` (ver a
   ressalva em `TopicSentiment.predominant`: com zero evidência o desempate diria
   "negativo" e o painel anunciaria "Clima do debate: Negativo").
4. **`/documents/{id}/comments` não monta thread.** Precisa do id do pai, que só
   existe no Mongo — em Postgres `metadados` é NULL.
5. **`Entity.role` fica vazio.** O schema tem `partido`, e o seed não o preenche.
6. **`entidade.foto` é `/fotos/<codigo>.jpg`** — um caminho que **a API precisa
   servir** (`PREFIXO_API` em `atualiza_fotos.py`). Hoje ela não monta esse diretório:
   o front pediria a imagem à própria origem e receberia 404.
7. **Sem view materializada.** As agregações rodam direto em `documento`. Os filtros de
   data são sargáveis (comparam `publicado_em` cru, usando `idx_documento_publicado`),
   mas conforme a tabela cresce isso vira o gargalo. A saída natural seria uma matview
   da série dia × entidade × fonte × tópico, com REFRESH agendado.
6. **`/me/tracked-candidates` não existe.** Persistir candidatos acompanhados por
   usuário exigiria uma tabela nova; hoje o front resolve em `sessionStorage` e o
   estado some ao fechar a aba.

## Testes

```bash
.venv/bin/python -m pytest tests/
```

156 testes em cinco camadas: regras de negócio (sem banco), endpoints e filtros,
coerência entre endpoints, conformidade com as interfaces TypeScript do front, e as
URLs que o `client.ts` realmente monta. Ver `tests/README.md` para os modos de execução.

## Verificação

O SQL foi executado contra um Postgres real (pglite) com schema e carga de teste, não
apenas compilado. Os invariantes cobertos: exclusão de `video`, `alvo_coleta` inativo,
tópicos de modelo arquivado, outlier (`numero = -1`) fora do ranking, split por
entidade sem perda nem duplicação, sentimento restrito ao modelo vigente, soma das
faixas do JSONB, uso de índice no filtro de data, agrupamento em horário de Brasília e
montagem da thread por `parent_id`/`parentId`.

Rodar contra Postgres real sem instalá-lo: pglite (Postgres em WASM) com
`@electric-sql/pglite-socket` expõe o protocolo de wire numa porta, e o asyncpg conecta
normalmente. Aceita **uma** conexão por vez, então use `PAVE_DB_POOL_SIZE=1` e
`PAVE_DB_MAX_OVERFLOW=0`.
