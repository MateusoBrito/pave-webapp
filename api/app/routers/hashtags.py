from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, Integer, String, Table, MetaData
from app.db import get_session
from app.schemas.responses import HashtagResponse

router = APIRouter(prefix="/hashtags", tags=["hashtags"])

metadata = MetaData()
candidato_hashtag_table = Table(
    "candidato_hashtag",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("fonte_codigo", String),
    Column("entidade_codigo", String),
    Column("hashtag", String),
    Column("contagem", Integer),
)

@router.get("/{entidade_codigo}", response_model=list[HashtagResponse])
async def listar_hashtags(entidade_codigo: str, session: AsyncSession = Depends(get_session)):
    codigo_normalizado = entidade_codigo.strip().lower()
    
    query = (
        candidato_hashtag_table.select()
        .where(candidato_hashtag_table.c.entidade_codigo.ilike(codigo_normalizado))
        .order_by(candidato_hashtag_table.c.contagem.desc())
        .limit(15)
    )
    result = await session.execute(query)
    rows = result.fetchall()
    
    return [
        {
            "hashtag": row.hashtag,
            "contagem": row.contagem,
            "fonte_codigo": row.fonte_codigo
        }
        for row in rows
    ]