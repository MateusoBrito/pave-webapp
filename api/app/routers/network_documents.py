"""Exemplos de publicações de uma rede, cruzando tópicos."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import Period, entity_ids, period_params
from ..queries import documents
from ..schemas.domain import Network, SentimentLabel, TopicDocument

router = APIRouter(tags=["documentos"])


@router.get("/networks/{network}/documents", response_model=list[TopicDocument], response_model_exclude_none=True)
async def network_documents(
    network: Network,
    period: Period = Depends(period_params),
    entities: list[str] = Depends(entity_ids),
    limit: int = Query(60, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    return await documents.network_documents(session, period, entities, network, limit)


@router.get("/documents/{documento_id}/comments", response_model_exclude_none=True)
async def publication_comments(
    documento_id: int,
    sentiment: SentimentLabel | None = Query(None, description="undefined = todos"),
    sort: str = Query("top", pattern="^(top|recent)$"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Thread de comentários de uma publicação."""
    resultado = await documents.publication_comments(
        session, documento_id, sentiment, sort, limit, offset
    )
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada."
        )
    return resultado
