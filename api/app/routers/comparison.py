"""Comparativo entre dois candidatos e sentimento por candidato."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import OrganicScope, Period, entity_ids, networks, organic_scope, period_params
from ..queries import comparison, series
from ..schemas.domain import Network
from ..schemas.responses import (
    CandidateSentimentPoint,
    CandidateSentimentSummary,
    ComparisonCandidateSummary,
)

router = APIRouter(tags=["comparativo"])


@router.get("/comparison/negative-sentiment-series", response_model=list[CandidateSentimentPoint])
async def negative_sentiment(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    """% negativo por dia. Meta Ads não tem sentimento, então sai sempre do escopo."""
    if escopo.empty:
        return []
    return await series.negative_sentiment_over_time(session, period, entities, escopo.networks)


@router.get("/comparison/{entity_id}/summary", response_model=ComparisonCandidateSummary, response_model_exclude_none=True)
async def summary(
    entity_id: str,
    period: Period = Depends(period_params),
    nets: list[Network] = Depends(networks),
    session: AsyncSession = Depends(get_session),
):
    resultado = await comparison.comparison_summary(session, entity_id, period, nets)
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidato não encontrado."
        )
    return resultado


@router.get("/candidates/sentiment", response_model=list[CandidateSentimentSummary], response_model_exclude_none=True)
async def candidate_sentiment(
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    escopo: OrganicScope = Depends(organic_scope),
    session: AsyncSession = Depends(get_session),
):
    if escopo.empty:
        return []
    return await comparison.candidate_sentiment_breakdown(
        session, period, entities, escopo.networks
    )
