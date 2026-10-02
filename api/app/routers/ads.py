"""Anúncios pagos (Meta Ad Library) — a tela "O que os candidatos postam?".

Todos os endpoints aqui ignoram o filtro global de rede de propósito: o escopo é
sempre `meta_ads`, porque a tela trata do que o candidato publica, não do que o
público comenta em outra rede.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import Period, entity_ids, period_params, platforms
from ..queries import documents
from ..queries.base import parse_topic_id
from ..schemas.domain import MetaAdPlatform, TopicDocument
from ..schemas.responses import (
    AdCandidateBreakdownRow,
    AdTopicDetail,
    AdTopicRankingRow,
    CandidateContentSummary,
    CandidateVolumePoint,
)

router = APIRouter(tags=["anúncios"])


@router.get("/candidates/posts", response_model=list[TopicDocument], response_model_exclude_none=True)
async def posts(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    plats: list[MetaAdPlatform] = Depends(platforms),
    limit: int = Query(60, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    return await documents.candidate_posts(session, period, entities, plats, limit)


@router.get("/candidates/content-summary", response_model=CandidateContentSummary)
async def content_summary(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    plats: list[MetaAdPlatform] = Depends(platforms),
    session: AsyncSession = Depends(get_session),
):
    return await documents.content_summary(session, period, entities, plats)


@router.get("/candidates/content/ranking", response_model=list[AdTopicRankingRow], response_model_exclude_none=True)
async def content_ranking(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    plats: list[MetaAdPlatform] = Depends(platforms),
    limit: int | None = Query(None, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    return await documents.ad_topic_ranking(session, period, entities, plats, limit)


@router.get("/candidates/content/by-candidate", response_model=list[AdCandidateBreakdownRow], response_model_exclude_none=True)
async def content_by_candidate(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    plats: list[MetaAdPlatform] = Depends(platforms),
    session: AsyncSession = Depends(get_session),
):
    return await documents.ad_candidate_breakdown(session, period, entities, plats)


def _split(topic_id: str) -> tuple[int, str]:
    parsed = parse_topic_id(topic_id)
    if parsed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tópico não encontrado."
        )
    return parsed


@router.get("/candidates/content/topics/{topic_id}", response_model=AdTopicDetail, response_model_exclude_none=True)
async def content_topic_detail(
    topic_id: str,
    plats: list[MetaAdPlatform] = Depends(platforms),
    session: AsyncSession = Depends(get_session),
):
    """Drill-down próprio para tópico de anúncio - ver AdTopicDetail.

    Não recebe período: `ad_topic_detail` calcula sobre a vigência do próprio tópico."""
    topico_id, entidade = _split(topic_id)
    resultado = await documents.ad_topic_detail(session, topic_id, topico_id, entidade, plats)
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tópico sem anúncios no período."
        )
    return resultado


@router.get("/candidates/content/topics/{topic_id}/series", response_model=list[CandidateVolumePoint])
async def content_topic_series(
    topic_id: str,
    period: Period = Depends(period_params),
    plats: list[MetaAdPlatform] = Depends(platforms),
    session: AsyncSession = Depends(get_session),
):
    topico_id, entidade = _split(topic_id)
    return await documents.ad_topic_series(session, topico_id, entidade, period, plats)
