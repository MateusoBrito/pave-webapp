"""Catálogo — as chamadas sem período, que o front faz uma vez e reaproveita."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..queries import catalog
from ..schemas.domain import EmergentTopic, Entity, RegistryCandidate, Topic
from ..schemas.responses import CollectionStatus

router = APIRouter(tags=["catálogo"])


@router.get("/entities", response_model=list[Entity], response_model_exclude_none=True)
async def list_entities(session: AsyncSession = Depends(get_session)):
    return await catalog.list_entities(session)


@router.get("/topics", response_model=list[Topic], response_model_exclude_none=True)
async def list_topics(session: AsyncSession = Depends(get_session)):
    return await catalog.list_topics(session)


@router.get("/topics/emergent", response_model=list[EmergentTopic])
async def list_emergent(session: AsyncSession = Depends(get_session)):
    return await catalog.list_emergent_topics(session)


@router.get("/collection/status", response_model=CollectionStatus)
async def collection_status(session: AsyncSession = Depends(get_session)):
    return await catalog.collection_status(session)


@router.get("/registry/candidates", response_model=list[RegistryCandidate])
async def registry(session: AsyncSession = Depends(get_session)):
    return await catalog.candidate_registry(session)
