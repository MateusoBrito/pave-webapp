"""Anúncios pagos (Meta Ad Library) — a tela "O que os candidatos postam?".

Todos os endpoints aqui ignoram o filtro global de rede de propósito: o escopo é
sempre `meta_ads`, porque a tela trata do que o candidato publica, não do que o
público comenta em outra rede.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import Period, entity_ids, period_params, platforms
from ..queries import documents
from ..schemas.domain import MetaAdPlatform, TopicDocument
from ..schemas.responses import (
    AdCandidateBreakdownRow,
    AdTopicRankingRow,
    CandidateContentSummary,
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
