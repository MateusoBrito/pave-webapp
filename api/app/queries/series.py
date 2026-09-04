"""Séries temporais e agregações de volume.

Alimentam a Visão Geral e o Comparativo. Todas partem da mesma junção de
`queries/base.py`; o que muda é o nível de agrupamento.
"""


from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import Period
from ..models import AlvoColeta, DocumentoTopico
from ..schemas.domain import (
    Network,
    TopicSentiment,
    TopicSeriesPoint,
    fonte_de,
    network_de,
)
from ..schemas.responses import (
    CandidateSentimentPoint,
    CandidateVolumePoint,
    EntityMentions,
    NetworkMentions,
    SentimentSeriesPoint,
    ShareOfVoiceEntry,
)
from .base import (
    NEGATIVE,
    NEUTRAL,
    POSITIVE,
    compose_topic_id,
    fact_select,
    local_date_column,
)


async def volume_over_time(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> list[CandidateVolumePoint]:
    """GET /series/volume — menções por dia e por candidato, somando tópicos e redes."""
    dia = local_date_column().label("dia")
    stmt = fact_select(
        dia,
        AlvoColeta.entidade_codigo.label("entidade"),
        func.count().label("mentions"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
        with_sentiment=False,
    ).group_by(dia, AlvoColeta.entidade_codigo).order_by(dia)

    rows = (await session.execute(stmt)).all()
    return [
        CandidateVolumePoint(date=row.dia, entity_id=row.entidade, mentions=row.mentions)
        for row in rows
    ]


async def mentions_by_network(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> list[NetworkMentions]:
    """GET /series/by-network — total por rede com a divisão por candidato dentro de
    cada barra.

    Devolve as três redes sempre, mesmo zeradas: o gráfico empilhado da Visão Geral
    tem eixo fixo e uma rede sumindo mudaria a leitura de "não teve menção" para "não
    existe essa rede".
    """
    stmt = fact_select(
        AlvoColeta.fonte_codigo.label("fonte"),
        AlvoColeta.entidade_codigo.label("entidade"),
        func.count().label("mentions"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
        with_sentiment=False,
    ).group_by(AlvoColeta.fonte_codigo, AlvoColeta.entidade_codigo)

    rows = (await session.execute(stmt)).all()

    por_rede: dict[str, dict[str, int]] = {}
    for row in rows:
        por_rede.setdefault(row.fonte, {})[row.entidade] = row.mentions

    escopo = networks or list(Network)
    entidades_presentes = sorted({row.entidade for row in rows} | set(entity_ids))

    resultado: list[NetworkMentions] = []
    for network in escopo:
        divisao = por_rede.get(fonte_de(network), {})
        by_entity = [
            EntityMentions(entity_id=eid, mentions=divisao.get(eid, 0))
            for eid in entidades_presentes
        ]
        resultado.append(
            NetworkMentions(
                network=network,
                mentions=sum(e.mentions for e in by_entity),
                by_entity=by_entity,
            )
        )
    return resultado


async def share_of_voice(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> list[ShareOfVoiceEntry]:
    """GET /series/share-of-voice — participação de cada candidato no total."""
    stmt = fact_select(
        AlvoColeta.entidade_codigo.label("entidade"),
        func.count().label("mentions"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
        with_sentiment=False,
    ).group_by(AlvoColeta.entidade_codigo)

    rows = (await session.execute(stmt)).all()
    total = sum(row.mentions for row in rows) or 1
    return [
        ShareOfVoiceEntry(
            entity_id=row.entidade, mentions=row.mentions, share=row.mentions / total
        )
        for row in rows
    ]


async def total_mentions(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> int:
    """Total simples do período — usado pelo KPI e pela variação vs. período anterior."""
    stmt = fact_select(
        func.count(),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
        with_sentiment=False,
    )
    return (await session.execute(stmt)).scalar_one() or 0


async def aggregate_sentiment(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> TopicSentiment:
    """Sentimento somado no período. Quem chama decide o escopo de rede — o painel
    nunca passa Meta Ads aqui, porque anúncio não tem reação pública coletável."""
    stmt = fact_select(
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
    )
    row = (await session.execute(stmt)).one()
    return TopicSentiment(
        negative=row.negative or 0, neutral=row.neutral or 0, positive=row.positive or 0
    )


async def coverage(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> tuple[int, int]:
    """(dias com pelo menos uma menção, tópicos ativos) — os KPIs de cobertura."""
    dia = local_date_column()
    stmt = fact_select(
        func.count(func.distinct(dia)).label("dias"),
        func.count(func.distinct(DocumentoTopico.topico_id)).label("topicos"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_sentiment=False,
    )
    row = (await session.execute(stmt)).one()
    return int(row.dias or 0), int(row.topicos or 0)


async def negative_sentiment_over_time(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> list[CandidateSentimentPoint]:
    """GET /comparison/negative-sentiment-series — % negativo por dia e por candidato.

    Percentual sobre o total **classificado** no dia: documento sem sentimento (rede
    sem modelo, ou ainda não processado) fica fora do denominador, senão a linha cairia
    por falta de classificação e não por mudança de humor.
    """
    dia = local_date_column().label("dia")
    stmt = (
        fact_select(
            dia,
            AlvoColeta.entidade_codigo.label("entidade"),
            NEGATIVE.label("negative"),
            (NEGATIVE + NEUTRAL + POSITIVE).label("classificados"),
            start=period.start,
            end=period.end,
            entity_ids=entity_ids,
            networks=networks,
            with_topic=False,
        )
        .group_by(dia, AlvoColeta.entidade_codigo)
        .order_by(dia)
    )

    rows = (await session.execute(stmt)).all()
    return [
        CandidateSentimentPoint(
            date=row.dia,
            entity_id=row.entidade,
            negative_pct=(row.negative / row.classificados * 100) if row.classificados else 0.0,
        )
        for row in rows
    ]


async def sentiment_series(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    topico_id: int | None = None,
    entidade: str | None = None,
) -> list[SentimentSeriesPoint]:
    """GET /topics/{id}/sentiment-series — série diária empilhada do drill-down."""
    dia = local_date_column().label("dia")
    stmt = fact_select(
        dia,
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        start=period.start,
        end=period.end,
        entity_ids=[entidade] if entidade else entity_ids,
        networks=networks,
    )
    if topico_id is not None:
        stmt = stmt.where(DocumentoTopico.topico_id == topico_id)
    stmt = stmt.group_by(dia).order_by(dia)

    rows = (await session.execute(stmt)).all()
    return [
        SentimentSeriesPoint(
            date=row.dia,
            sentiment=TopicSentiment(
                negative=row.negative or 0,
                neutral=row.neutral or 0,
                positive=row.positive or 0,
            ),
        )
        for row in rows
    ]


async def topic_series(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    topic_ids: list[tuple[int, str]] | None = None,
) -> list[TopicSeriesPoint]:
    """GET /series — pontos brutos dia × candidato × rede × tópico.

    É o único endpoint que devolve a granularidade completa; o front pivota por conta
    própria (`lib/chartData.pivotByDate`) para o gráfico empilhado de tópicos.

    `topic_ids` chega já decomposto em (id do tópico, entidade) — o filtro casa os dois
    juntos, porque `10-lula` e `10-flavio` são tópicos distintos para a API.
    """
    from sqlalchemy import tuple_

    dia = local_date_column().label("dia")
    stmt = fact_select(
        dia,
        AlvoColeta.entidade_codigo.label("entidade"),
        AlvoColeta.fonte_codigo.label("fonte"),
        DocumentoTopico.topico_id.label("topico_id"),
        func.count().label("mentions"),
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
    )
    if topic_ids:
        stmt = stmt.where(
            tuple_(DocumentoTopico.topico_id, AlvoColeta.entidade_codigo).in_(topic_ids)
        )
    stmt = stmt.group_by(
        dia,
        AlvoColeta.entidade_codigo,
        AlvoColeta.fonte_codigo,
        DocumentoTopico.topico_id,
    ).order_by(dia)

    rows = (await session.execute(stmt)).all()
    pontos: list[TopicSeriesPoint] = []
    for row in rows:
        rede = network_de(row.fonte)
        if rede is None:
            continue
        pontos.append(
            TopicSeriesPoint(
                date=row.dia,
                entity_id=row.entidade,
                network=rede,
                topic_id=compose_topic_id(row.topico_id, row.entidade),
                mentions=row.mentions,
                sentiment=TopicSentiment(
                    negative=row.negative or 0,
                    neutral=row.neutral or 0,
                    positive=row.positive or 0,
                ),
            )
        )
    return pontos


async def sentiment_by_entity(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> dict[str, TopicSentiment]:
    """Sentimento agregado de todos os candidatos numa consulta só.

    Existe para o card "Sentimento por candidato", que precisa de uma linha por
    candidato — pedir cada uma separadamente seria uma query por linha.
    """
    stmt = fact_select(
        AlvoColeta.entidade_codigo.label("entidade"),
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        with_topic=False,
    ).group_by(AlvoColeta.entidade_codigo)

    rows = (await session.execute(stmt)).all()
    return {
        row.entidade: TopicSentiment(
            negative=row.negative or 0,
            neutral=row.neutral or 0,
            positive=row.positive or 0,
        )
        for row in rows
    }
