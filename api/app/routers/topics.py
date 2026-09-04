"""Ranking, drill-down e distribuição de tópicos."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import OrganicScope, Period, entity_ids, organic_scope, period_params
from ..queries import comparison, documents, series, topics
from ..queries.base import parse_topic_id
from ..schemas.domain import Network, TopicDocument
from ..schemas.responses import (
    CandidateTopicListResult,
    CandidateVolumePoint,
    SentimentSeriesPoint,
    SubdivisionMatrix,
    TopicDetail,
    TopicRankingRow,
)

router = APIRouter(tags=["tópicos"])


def _split(topic_id: str) -> tuple[int, str]:
    parsed = parse_topic_id(topic_id)
    if parsed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tópico não encontrado."
        )
    return parsed


@router.get("/topics/ranking", response_model=list[TopicRankingRow], response_model_exclude_none=True)
async def ranking(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    escopo: OrganicScope = Depends(organic_scope),
    limit: int | None = Query(None, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    """Ranking de tópicos. Meta Ads nunca entra — conteúdo pago do candidato não é
    conversa do público. Filtrar só Meta Ads devolve lista vazia, não "tudo"."""
    if escopo.empty:
        return []
    return await topics.topic_ranking(session, period, entities, escopo.networks, limit)


@router.get("/topics/by-subdivision", response_model=SubdivisionMatrix, response_model_exclude_none=True)
async def by_subdivision(
    network: Network = Query(..., description="Rede orgânica: reddit ou youtube"),
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    session: AsyncSession = Depends(get_session),
):
    """Distribuição por subreddit (Reddit) ou canal (YouTube), a partir de
    `alvo_coleta.canal`."""
    if network == Network.META_ADS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Subdivisão só existe para redes orgânicas (reddit ou youtube).",
        )
    return await topics.topics_by_subdivision(session, period, entities, network)


@router.get("/topics/{topic_id}", response_model=TopicDetail, response_model_exclude_none=True)
async def detail(
    topic_id: str,
    period: Period = Depends(period_params),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    topico_id, entidade = _split(topic_id)
    resultado = await topics.topic_detail(
        session, topic_id, topico_id, entidade, period, escopo.networks
    )
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tópico sem dados no período."
        )
    return resultado


@router.get("/topics/{topic_id}/series-by-candidate", response_model=list[CandidateVolumePoint])
async def series_by_candidate(
    topic_id: str,
    period: Period = Depends(period_params),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    """Evolução do tópico. Como o tópico já pertence a um candidato só, a série tem
    uma linha — é o que o gráfico do drill-down espera."""
    topico_id, entidade = _split(topic_id)
    from sqlalchemy import func

    from ..models import DocumentoTopico
    from ..queries.base import fact_select, local_date_column

    dia = local_date_column().label("dia")
    stmt = (
        fact_select(
            dia,
            func.count().label("mentions"),
            start=period.start,
            end=period.end,
            entity_ids=[entidade],
            networks=escopo.networks,
            with_sentiment=False,
        )
        .where(DocumentoTopico.topico_id == topico_id)
        .group_by(dia)
        .order_by(dia)
    )
    rows = (await session.execute(stmt)).all()
    return [
        CandidateVolumePoint(date=row.dia, entity_id=entidade, mentions=row.mentions)
        for row in rows
    ]


@router.get("/topics/{topic_id}/sentiment-series", response_model=list[SentimentSeriesPoint])
async def sentiment_series(
    topic_id: str,
    period: Period = Depends(period_params),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    topico_id, entidade = _split(topic_id)
    return await series.sentiment_series(
        session, period, [], escopo.networks, topico_id=topico_id, entidade=entidade
    )


@router.get("/topics/{topic_id}/documents", response_model=list[TopicDocument], response_model_exclude_none=True)
async def topic_documents(
    topic_id: str,
    escopo: OrganicScope = Depends(organic_scope),
    limit: int = Query(60, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    topico_id, entidade = _split(topic_id)
    return await documents.topic_documents(
        session, topico_id, entidade, escopo.networks, limit
    )


@router.get("/candidates/{entity_id}/topics", response_model=CandidateTopicListResult, response_model_exclude_none=True)
async def candidate_topics(
    entity_id: str,
    network: Network = Query(...),
    period: Period = Depends(period_params),
    search: str = Query("", max_length=120),
    filter: str = Query("all", pattern="^(all|emerging|declining)$"),
    sort: str = Query("mentions", pattern="^(mentions|alpha)$"),
    limit: int | None = Query(None, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    return await comparison.candidate_topic_list(
        session, entity_id, network, period, search, filter, sort, limit
    )
