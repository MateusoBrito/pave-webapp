"""Ranking, detalhe e distribuição de tópicos.

Cada linha aqui é um par (tópico do modelo, entidade) — ver a docstring de
`queries/base.py` para por que o tópico é partido por entidade.
"""


from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import Period
from ..models import AlvoColeta, DocumentoTopico, Entidade, Topico
from ..schemas.domain import Network, Topic, TopicSentiment, network_de
from ..schemas.responses import (
    SubdivisionColumn,
    SubdivisionMatrix,
    SubdivisionRow,
    TopicDetail,
    TopicRankingRow,
)
from .base import (
    NEGATIVE,
    NEUTRAL,
    POSITIVE,
    canal_label,
    compose_topic_id,
    fact_select,
    local_date_column,
    topic_emergent,
    topic_label,
)


def _build_topic(row, weight: float) -> Topic:
    return Topic(
        id=compose_topic_id(row.topico_id, row.entidade),
        entity_id=row.entidade,
        label=topic_label(row.rotulo, row.numero, row.palavras_chave),
        weight=weight,
        tags=list(row.palavras_chave or []),
        emergent=topic_emergent(row.revisado),
    )


async def _ranking_rows(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    topico_id: int | None = None,
) -> list:
    """Agregação por (tópico, entidade) com sentimento e rede dominante."""
    stmt = fact_select(
        DocumentoTopico.topico_id.label("topico_id"),
        AlvoColeta.entidade_codigo.label("entidade"),
        Topico.rotulo,
        Topico.numero,
        Topico.palavras_chave,
        Topico.revisado,
        func.count().label("mentions"),
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        func.mode().within_group(AlvoColeta.fonte_codigo).label("fonte_dominante"),
        func.max(local_date_column()).label("ultima_data"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
    )
    if topico_id is not None:
        stmt = stmt.where(DocumentoTopico.topico_id == topico_id)
    stmt = stmt.group_by(
        DocumentoTopico.topico_id,
        AlvoColeta.entidade_codigo,
        Topico.rotulo,
        Topico.numero,
        Topico.palavras_chave,
        Topico.revisado,
    )
    return (await session.execute(stmt)).all()


async def topic_ranking(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    limit: int | None = None,
) -> list[TopicRankingRow]:
    """GET /topics/ranking.

    `variationPct` compara com o período imediatamente anterior de mesma duração
    (`Period.previous()`). Tópico sem menção no período anterior fica com 0% em vez de
    infinito — mesmo tratamento do mock, e evita "+∞%" na tabela.

    Quem chama já restringe `networks` às orgânicas: Meta Ads é conteúdo do próprio
    candidato e não entra em ranking de conversa pública.
    """
    atual = await _ranking_rows(session, period, entity_ids, networks)
    anterior = await _ranking_rows(session, period.previous(), entity_ids, networks)

    antes = {(row.topico_id, row.entidade): row.mentions for row in anterior}
    total_por_entidade: dict[str, int] = {}
    for row in atual:
        total_por_entidade[row.entidade] = total_por_entidade.get(row.entidade, 0) + row.mentions

    linhas: list[TopicRankingRow] = []
    for row in atual:
        if row.mentions <= 0:
            continue
        anterior_mentions = antes.get((row.topico_id, row.entidade), 0)
        variacao = (
            ((row.mentions - anterior_mentions) / anterior_mentions * 100)
            if anterior_mentions > 0
            else 0.0
        )
        total = total_por_entidade.get(row.entidade) or 1
        linhas.append(
            TopicRankingRow(
                topic=_build_topic(row, row.mentions / total),
                mentions=row.mentions,
                variation_pct=variacao,
                dominant_network=network_de(row.fonte_dominante) or Network.REDDIT,
                sentiment=TopicSentiment(
                    negative=row.negative or 0,
                    neutral=row.neutral or 0,
                    positive=row.positive or 0,
                ),
            )
        )

    linhas.sort(key=lambda r: r.mentions, reverse=True)
    return linhas[:limit] if limit else linhas


async def topic_detail(
    session: AsyncSession,
    topic_id: str,
    topico_id: int,
    entidade: str,
    period: Period,
    networks: list[Network],
) -> TopicDetail | None:
    """GET /topics/{id} — cabeçalho do drill-down.

    `sharePct` é sobre o total de menções de **todos** os tópicos no período, com o
    mesmo escopo de rede — é o que o mock calcula e o que a tela rotula como
    "share do total".
    """
    linhas = await _ranking_rows(session, period, [entidade], networks, topico_id=topico_id)
    if not linhas:
        return None
    row = linhas[0]

    total_stmt = fact_select(
        func.count(),
        start=period.start,
        end=period.end,
        entity_ids=[],
        networks=networks,
        with_sentiment=False,
    )
    total = (await session.execute(total_stmt)).scalar_one() or 1

    dia = local_date_column().label("dia")
    pico_stmt = (
        fact_select(
            dia,
            func.count().label("mentions"),
            start=period.start,
            end=period.end,
            entity_ids=[entidade],
            networks=networks,
            with_sentiment=False,
        )
        .where(DocumentoTopico.topico_id == topico_id)
        .group_by(dia)
        .order_by(func.count().desc())
        .limit(1)
    )
    pico = (await session.execute(pico_stmt)).first()

    return TopicDetail(
        topic=_build_topic(row, row.mentions / total if total else 0.0),
        mentions=row.mentions,
        share_pct=row.mentions / total * 100,
        sentiment=TopicSentiment(
            negative=row.negative or 0,
            neutral=row.neutral or 0,
            positive=row.positive or 0,
        ),
        peak_date=pico.dia if pico else None,
        dominant_network=network_de(row.fonte_dominante) or Network.REDDIT,
    )


async def topics_by_subdivision(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    network: Network,
) -> SubdivisionMatrix:
    """GET /topics/by-subdivision — "Tópicos por subreddit" / "Tópicos por canal".

    `alvo_coleta.canal` é a subdivisão real (o subreddit no Reddit, o canal no
    YouTube), então isto é contagem de verdade. O mock repartia o total do tópico
    entre 8 subreddits fixos por um peso pseudoaleatório, só para ilustrar.
    """
    stmt = (
        fact_select(
            DocumentoTopico.topico_id.label("topico_id"),
            AlvoColeta.entidade_codigo.label("entidade"),
            AlvoColeta.canal.label("canal"),
            AlvoColeta.fonte_codigo.label("fonte"),
            Entidade.nome_exibicao.label("nome_entidade"),
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
            func.count().label("mentions"),
            start=period.start,
            end=period.end,
            entity_ids=entity_ids,
            networks=[network],
            with_sentiment=False,
        )
        .join(Entidade, Entidade.codigo == AlvoColeta.entidade_codigo)
        .group_by(
            DocumentoTopico.topico_id,
            AlvoColeta.entidade_codigo,
            AlvoColeta.canal,
            AlvoColeta.fonte_codigo,
            Entidade.nome_exibicao,
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
        )
    )
    rows = (await session.execute(stmt)).all()

    rotulos = {
        row.canal: canal_label(row.fonte, row.canal, row.nome_entidade) for row in rows
    }
    canais = sorted(rotulos, key=lambda c: rotulos[c])
    por_topico: dict[tuple[int, str], dict] = {}
    for row in rows:
        chave = (row.topico_id, row.entidade)
        entrada = por_topico.setdefault(chave, {"row": row, "valores": {}, "total": 0})
        entrada["valores"][row.canal] = entrada["valores"].get(row.canal, 0) + row.mentions
        entrada["total"] += row.mentions

    total_geral = sum(e["total"] for e in por_topico.values()) or 1
    linhas = [
        SubdivisionRow(
            topic=_build_topic(entrada["row"], entrada["total"] / total_geral),
            values={canal: entrada["valores"].get(canal, 0) for canal in canais},
        )
        for entrada in sorted(por_topico.values(), key=lambda e: e["total"], reverse=True)
    ]

    maximo = max((v for linha in linhas for v in linha.values.values()), default=0)
    return SubdivisionMatrix(
        columns=[SubdivisionColumn(key=c, label=rotulos[c]) for c in canais],
        rows=linhas,
        max_value=max(1, maximo),
        unit_label="comentários",
    )
