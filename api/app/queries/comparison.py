"""Comparativo entre candidatos e lista de tópicos por candidato.

São composições das agregações de `series.py` e `topics.py` — nenhuma consulta nova
ao banco além da busca da entidade.
"""

import unicodedata

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import Period
from ..models import Entidade
from ..schemas.domain import Entity, Network, TopicSentiment
from ..schemas.responses import (
    CandidateSentimentSummary,
    CandidateTopicListResult,
    CandidateTopicListRow,
    ComparisonCandidateSummary,
    TopicMentions,
)
from .series import aggregate_sentiment, sentiment_by_entity
from .topics import topic_ranking

COMPARISON_TOP_TOPICS = 7


def _chave_alfabetica(texto: str) -> str:
    """Chave de ordenação A–Z que respeita o alfabeto português.

    `casefold()` sozinho ordena por code point, e todo acento fica acima de "z":
    "Água" e "Ética" iriam parar depois de "Zona rural". O front (que ordenava com
    `localeCompare("pt-BR")`) não fazia isso. Remover os diacríticos antes de comparar
    reproduz a ordem esperada sem depender de locale instalado no servidor.
    """
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acento.casefold()


async def _entity(session: AsyncSession, codigo: str) -> Entity | None:
    row = (
        await session.execute(
            select(
                Entidade.codigo, Entidade.nome_exibicao, Entidade.partido, Entidade.foto
            ).where(Entidade.codigo == codigo)
        )
    ).first()
    if row is None:
        return None
    return Entity(
        id=row.codigo,
        name=row.nome_exibicao,
        role=row.partido or "",
        aliases=[],
        photo_url=row.foto,
    )


async def comparison_summary(
    session: AsyncSession,
    entity_id: str,
    period: Period,
    networks: list[Network],
) -> ComparisonCandidateSummary | None:
    """GET /comparison/{entityId}/summary."""
    entity = await _entity(session, entity_id)
    if entity is None:
        return None

    ranking = await topic_ranking(session, period, [entity_id], networks)
    principais = ranking[:COMPARISON_TOP_TOPICS]
    resto = ranking[COMPARISON_TOP_TOPICS:]

    return ComparisonCandidateSummary(
        entity=entity,
        mentions=sum(r.mentions for r in ranking),
        sentiment=await aggregate_sentiment(session, period, [entity_id], networks),
        top_topics=[TopicMentions(topic=r.topic, mentions=r.mentions) for r in principais],
        other_topics_count=len(resto),
        other_topics_mentions=sum(r.mentions for r in resto),
    )


async def candidate_sentiment_breakdown(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
) -> list[CandidateSentimentSummary]:
    """GET /candidates/sentiment — card "Sentimento por candidato".

    Devolve todo candidato pedido, inclusive os sem menção no período: sumir da lista
    faria parecer que o candidato não é monitorado, quando o certo é mostrar zero.
    """
    stmt = select(
        Entidade.codigo, Entidade.nome_exibicao, Entidade.partido, Entidade.foto
    ).where(Entidade.ativa.is_(True))
    if entity_ids:
        stmt = stmt.where(Entidade.codigo.in_(entity_ids))
    stmt = stmt.order_by(Entidade.nome_exibicao)
    entidades = (await session.execute(stmt)).all()

    por_entidade = await sentiment_by_entity(session, period, entity_ids, networks)

    return [
        CandidateSentimentSummary(
            entity=Entity(
                id=row.codigo,
                name=row.nome_exibicao,
                role=row.partido or "",
                aliases=[],
                photo_url=row.foto,
            ),
            sentiment=por_entidade.get(row.codigo, TopicSentiment()),
        )
        for row in entidades
    ]


async def candidate_topic_list(
    session: AsyncSession,
    entity_id: str,
    network: Network,
    period: Period,
    search: str = "",
    filtro: str = "all",
    sort: str = "mentions",
    limit: int | None = None,
) -> CandidateTopicListResult:
    """GET /candidates/{id}/topics — modal "Todos os tópicos do candidato".

    `sharePct` é sempre relativo à lista inteira, não ao recorte filtrado: o número
    ao lado de cada tópico não pode mudar só porque o usuário digitou na busca.
    """
    todas = await topic_ranking(session, period, [entity_id], [network])
    total_mentions = sum(r.mentions for r in todas)

    com_share = [
        CandidateTopicListRow(
            topic=r.topic,
            mentions=r.mentions,
            variation_pct=r.variation_pct,
            dominant_network=r.dominant_network,
            sentiment=r.sentiment,
            share_pct=(r.mentions / total_mentions * 100) if total_mentions else 0.0,
        )
        for r in todas
    ]

    filtradas = com_share
    if filtro == "emerging":
        filtradas = [r for r in filtradas if r.topic.emergent]
    elif filtro == "declining":
        filtradas = [r for r in filtradas if r.variation_pct < 0]

    termo = search.strip().lower()
    if termo:
        filtradas = [
            r
            for r in filtradas
            if termo in r.topic.label.lower()
            or any(termo in tag.lower() for tag in r.topic.tags)
        ]

    if sort == "alpha":
        filtradas = sorted(filtradas, key=lambda r: _chave_alfabetica(r.topic.label))

    exibidas = filtradas[:limit] if limit else filtradas
    return CandidateTopicListResult(
        entity=await _entity(session, entity_id),
        network=network,
        total_topics=len(todas),
        total_mentions=total_mentions,
        rows=exibidas,
        total_filtered=len(filtradas),
        remaining_mentions=sum(r.mentions for r in filtradas[len(exibidas):]),
    )
