"""Séries, KPIs e destaques da Visão Geral."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import OrganicScope, Period, entity_ids, networks, organic_scope, period_params
from ..queries import catalog, series, topics
from ..queries.base import parse_topic_id
from ..schemas.domain import NETWORK_LABELS, Network, TopicSeriesPoint
from ..schemas.responses import (
    CandidateVolumePoint,
    Highlight,
    HighlightKind,
    NetworkMentions,
    OverviewSummary,
    ShareOfVoiceEntry,
)

router = APIRouter(tags=["séries"])


@router.get("/series", response_model=list[TopicSeriesPoint])
async def topic_series(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    topics_filter: str | None = Query(
        None, alias="topics", description="ids compostos separados por vírgula"
    ),
    session: AsyncSession = Depends(get_session),
):
    """Pontos brutos, na granularidade completa. Vazio = sem restrição, como no resto."""
    alvos = None
    if topics_filter:
        pares = [parse_topic_id(t) for t in topics_filter.split(",") if t]
        alvos = [p for p in pares if p is not None]
    return await series.topic_series(session, period, entities, nets, alvos)


@router.get("/series/volume", response_model=list[CandidateVolumePoint])
async def volume(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    session: AsyncSession = Depends(get_session),
):
    return await series.volume_over_time(session, period, entities, nets)


@router.get("/series/by-network", response_model=list[NetworkMentions])
async def by_network(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    session: AsyncSession = Depends(get_session),
):
    return await series.mentions_by_network(session, period, entities, nets)


@router.get("/series/share-of-voice", response_model=list[ShareOfVoiceEntry])
async def share_of_voice(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    session: AsyncSession = Depends(get_session),
):
    return await series.share_of_voice(session, period, entities, nets)


@router.get("/overview/summary", response_model=OverviewSummary)
async def overview_summary(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    """KPIs do topo.

    O "clima do debate" soma só as redes orgânicas — anúncio pago não é humor do
    público. Quando o usuário filtra apenas Meta Ads não sobra rede orgânica, e aí o
    sentimento é zerado de propósito (`OrganicScope.empty`) em vez de recair sobre
    todas as redes.
    """
    total = await series.total_mentions(session, period, entities, nets)
    anterior = await series.total_mentions(session, period.previous(), entities, nets)
    delta = ((total - anterior) / anterior * 100) if anterior > 0 else 0.0

    sentimento = (
        await series.aggregate_sentiment(session, period, entities, escopo.networks)
        if not escopo.empty
        else None
    )
    from ..schemas.domain import TopicSentiment

    sentimento = sentimento or TopicSentiment()
    dias, topicos_ativos = await series.coverage(session, period, entities, nets)

    return OverviewSummary(
        total_mentions=total,
        delta_pct=delta,
        organic_sentiment=sentimento,
        predominant_sentiment=sentimento.predominant,
        active_topics=topicos_ativos,
        emergent_count=len(await catalog.list_emergent_topics(session)),
        days_covered=dias,
        total_days=period.days,
        total_networks=len(nets) if nets else len(Network),
    )


@router.get("/overview/highlights", response_model=list[Highlight])
async def highlights(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    nets: list[Network] = Depends(networks),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    """Frases de destaque derivadas dos mesmos agregados do ranking e do por-rede —
    nenhuma fonte de dado nova, nada gerado por modelo de linguagem."""
    destaques: list[Highlight] = []

    if not escopo.empty:
        ranking = await topics.topic_ranking(session, period, entities, escopo.networks, limit=1)
        if ranking:
            destaques.append(
                Highlight(
                    kind=HighlightKind.TOP_TOPIC,
                    title=f"{ranking[0].topic.label} lidera a atenção.",
                    description="Foi o assunto que mais ocupou espaço na conversa no período.",
                )
            )

    atual = {n.network: n.mentions for n in await series.mentions_by_network(session, period, entities, nets)}
    anterior = {
        n.network: n.mentions
        for n in await series.mentions_by_network(session, period.previous(), entities, nets)
    }

    melhor: Network | None = None
    maior_alta = 0.0
    for network, mencoes in atual.items():
        antes = anterior.get(network, 0)
        if antes <= 0 or mencoes <= 0:
            continue
        alta = (mencoes - antes) / antes * 100
        if alta > maior_alta:
            maior_alta, melhor = alta, network

    if melhor is not None:
        rotulo = NETWORK_LABELS[melhor]
        destaques.append(
            Highlight(
                kind=HighlightKind.NETWORK_GROWTH,
                title=f"Presença ganhou força no {rotulo}.",
                description=(
                    f"O volume no {rotulo} foi {maior_alta:.0f}% maior que no período anterior."
                ),
            )
        )

    return destaques
