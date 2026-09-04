"""Documentos, anúncios e threads de comentários.

Estas consultas leem `documento.metadados` — ver `queries/metadata.py` para as chaves
esperadas e a ressalva sobre o formato ainda não confirmado.
"""

from datetime import UTC, datetime

from sqlalchemy import DateTime, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import Period
from ..models import (
    AlvoColeta,
    Documento,
    DocumentoTopico,
    Entidade,
    PolaridadeEnum,
    Sentimento,
    TipoDocumentoEnum,
    TipoModeloEnum,
    Topico,
)
from ..schemas.domain import (
    AdMetadata,
    Entity,
    MetaAdPlatform,
    Network,
    SentimentLabel,
    Topic,
    TopicDocument,
    TopicSentiment,
    fonte_de,
    network_de,
)
from ..schemas.responses import (
    AdCandidateBreakdownRow,
    AdTopicRankingRow,
    CandidateContentSummary,
)
from .base import (
    TIPOS_MENCAO,
    canal_label,
    compose_topic_id,
    day_bounds,
    topic_emergent,
    topic_label,
    vigente_model_ids,
)
from .metadata import (
    AD_CTA_KEYS,
    AD_DOMAIN_KEYS,
    AD_HEADLINE_KEYS,
    AD_IMPRESSIONS_KEY,
    AD_PLATFORMS_KEYS,
    AD_SPEND_KEY,
    AD_START_KEYS,
    AD_STOP_KEYS,
    AUTHOR_KEYS,
    ENGAGEMENT_KEYS,
    PARENT_KEYS,
    ad_bound_sql,
    bound,
    first_key,
    has_platform,
    pseudonymize,
)

POLARIDADE_PARA_LABEL = {
    PolaridadeEnum.negativo: SentimentLabel.NEGATIVE,
    PolaridadeEnum.neutro: SentimentLabel.NEUTRAL,
    PolaridadeEnum.positivo: SentimentLabel.POSITIVE,
}

DEFAULT_DOCUMENT_LIMIT = 60


def _parse_dt(value) -> datetime | None:
    """Data do JSONB como datetime *sempre* com fuso.

    A Ad Library mistura formatos — `2026-08-05`, `2026-08-05T10:00:00` e
    `2026-08-05T10:00:00+00:00` — e um coletor pode gravar qualquer um deles. Sem
    normalizar, comparar o resultado com `publicado_em` (timestamptz, ciente do fuso)
    levanta `TypeError: can't subtract offset-naive and offset-aware datetimes` e
    derruba a listagem inteira de anúncios. Data sem offset é lida como UTC, que é o
    que a Meta declara.
    """
    parsed: datetime | None = None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
    if parsed is not None and parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def _build_ad(meta: dict | None, publicado_em: datetime) -> AdMetadata | None:
    """Metadados de anúncio a partir do JSONB da Ad Library."""
    if not meta:
        return None

    fim = _parse_dt(first_key(meta, AD_STOP_KEYS))
    inicio = _parse_dt(first_key(meta, AD_START_KEYS)) or publicado_em
    referencia = fim or datetime.now(UTC)
    dias = max(0, (referencia - inicio).days)

    plataformas_raw = first_key(meta, AD_PLATFORMS_KEYS) or []
    plataformas = [
        MetaAdPlatform(p)
        for p in plataformas_raw
        if p in {m.value for m in MetaAdPlatform}
    ]

    return AdMetadata(
        investment_min_brl=bound(meta, AD_SPEND_KEY, "lower_bound"),
        investment_max_brl=bound(meta, AD_SPEND_KEY, "upper_bound"),
        impressions_min=bound(meta, AD_IMPRESSIONS_KEY, "lower_bound"),
        impressions_max=bound(meta, AD_IMPRESSIONS_KEY, "upper_bound"),
        days_active=dias,
        platforms=plataformas or [MetaAdPlatform.FACEBOOK],
        headline=first_key(meta, AD_HEADLINE_KEYS) or "",
        domain=first_key(meta, AD_DOMAIN_KEYS) or "",
        cta=first_key(meta, AD_CTA_KEYS) or "Saiba mais",
    )


def _build_document(row) -> TopicDocument | None:
    """`None` quando a fonte do documento não é uma das redes do painel — omitir a
    linha é melhor que derrubar a listagem inteira com ValueError."""
    rede = network_de(row.fonte)
    if rede is None:
        return None
    meta = row.metadados or {}
    return TopicDocument(
        id=str(row.id),
        topic_id=compose_topic_id(row.topico_id, row.entidade) if row.topico_id else "",
        entity_id=row.entidade,
        network=rede,
        author=pseudonymize(first_key(meta, AUTHOR_KEYS), row.id),
        text=row.texto or "",
        published_at=row.publicado_em,
        engagement=int(first_key(meta, ENGAGEMENT_KEYS) or 0),
        sentiment=POLARIDADE_PARA_LABEL.get(row.polaridade, SentimentLabel.NEUTRAL),
        ad=_build_ad(meta, row.publicado_em) if rede is Network.META_ADS else None,
    )


def _document_select(period: Period | None, entity_ids: list[str]):
    """Colunas comuns a toda listagem de documento, já com tópico e sentimento."""
    stmt = (
        select(
            Documento.id,
            Documento.texto,
            Documento.publicado_em,
            Documento.metadados,
            AlvoColeta.entidade_codigo.label("entidade"),
            AlvoColeta.fonte_codigo.label("fonte"),
            DocumentoTopico.topico_id.label("topico_id"),
            Sentimento.polaridade.label("polaridade"),
        )
        .select_from(Documento)
        .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
        .outerjoin(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
        .outerjoin(
            Sentimento,
            (Sentimento.documento_id == Documento.id)
            & Sentimento.modelo_id.in_(vigente_model_ids(TipoModeloEnum.sentimento)),
        )
        .where(AlvoColeta.ativo.is_(True))
        .order_by(Documento.publicado_em.desc())
    )
    if period is not None:
        inicio, fim = day_bounds(period.start, period.end)
        stmt = stmt.where(Documento.publicado_em >= inicio, Documento.publicado_em < fim)
    if entity_ids:
        stmt = stmt.where(AlvoColeta.entidade_codigo.in_(entity_ids))
    return stmt


async def topic_documents(
    session: AsyncSession,
    topico_id: int,
    entidade: str,
    networks: list[Network],
    limit: int = DEFAULT_DOCUMENT_LIMIT,
) -> list[TopicDocument]:
    """GET /topics/{topicId}/documents — exemplos do drill-down."""
    stmt = (
        _document_select(None, [entidade])
        .where(
            DocumentoTopico.topico_id == topico_id,
            Documento.tipo.in_(TIPOS_MENCAO),
        )
        .limit(limit)
    )
    if networks:
        stmt = stmt.where(AlvoColeta.fonte_codigo.in_([fonte_de(n) for n in networks]))
    rows = (await session.execute(stmt)).all()
    return [d for d in (_build_document(row) for row in rows) if d is not None]


async def network_documents(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    network: Network,
    limit: int = DEFAULT_DOCUMENT_LIMIT,
) -> list[TopicDocument]:
    """GET /networks/{network}/documents — exemplos de uma rede, cruzando tópicos."""
    stmt = (
        _document_select(period, entity_ids)
        .where(
            AlvoColeta.fonte_codigo == fonte_de(network),
            Documento.tipo.in_(TIPOS_MENCAO),
        )
        .limit(limit)
    )
    rows = (await session.execute(stmt)).all()
    return [d for d in (_build_document(row) for row in rows) if d is not None]


def _ads_filter(stmt, platforms: list[MetaAdPlatform]):
    """Anúncios são sempre e só `meta_ads` + `tipo = anuncio`, independente do filtro
    de rede: a tela "O que os candidatos postam?" mostra conteúdo do candidato, não
    conversa do público em outra rede."""
    stmt = stmt.where(
        AlvoColeta.fonte_codigo == fonte_de(Network.META_ADS),
        Documento.tipo == TipoDocumentoEnum.anuncio,
    )
    if platforms:
        stmt = stmt.where(or_(*[has_platform(p.value) for p in platforms]))
    return stmt


async def candidate_posts(
    session: AsyncSession,
    period: Period | None,
    entity_ids: list[str],
    platforms: list[MetaAdPlatform],
    limit: int = DEFAULT_DOCUMENT_LIMIT,
) -> list[TopicDocument]:
    """GET /candidates/posts — anúncios pagos, para o carrossel de exemplos."""
    stmt = _ads_filter(_document_select(period, entity_ids), platforms).limit(limit)
    rows = (await session.execute(stmt)).all()
    return [d for d in (_build_document(row) for row in rows) if d is not None]


async def content_summary(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    platforms: list[MetaAdPlatform],
) -> CandidateContentSummary:
    """GET /candidates/content-summary — KPIs de investimento e alcance.

    Soma as faixas declaradas: o mínimo agregado soma os pisos, o máximo soma os
    tetos. Não é um intervalo estatístico, é o que a Ad Library permite afirmar.
    """
    inicio, fim = day_bounds(period.start, period.end)
    agora = datetime.now(UTC)

    termino = func.nullif(Documento.metadados[AD_STOP_KEYS[0]].astext, "")
    ativo = termino.is_(None) | (cast(termino, DateTime(timezone=True)) > agora)

    stmt = (
        select(
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "lower_bound")), 0),
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "upper_bound")), 0),
            func.count(),
            func.count().filter(ativo),
            func.coalesce(func.sum(ad_bound_sql(AD_IMPRESSIONS_KEY, "lower_bound")), 0),
            func.coalesce(func.sum(ad_bound_sql(AD_IMPRESSIONS_KEY, "upper_bound")), 0),
        )
        .select_from(Documento)
        .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
        .where(
            Documento.publicado_em >= inicio,
            Documento.publicado_em < fim,
            AlvoColeta.ativo.is_(True),
        )
    )
    if entity_ids:
        stmt = stmt.where(AlvoColeta.entidade_codigo.in_(entity_ids))
    stmt = _ads_filter(stmt, platforms)

    row = (await session.execute(stmt)).one()
    return CandidateContentSummary(
        investment_min_brl=int(row[0]),
        investment_max_brl=int(row[1]),
        ads_count=int(row[2]),
        active_ads_count=int(row[3]),
        impressions_min_total=int(row[4]),
        impressions_max_total=int(row[5]),
    )


async def ad_topic_ranking(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    platforms: list[MetaAdPlatform],
    limit: int | None = None,
) -> list[AdTopicRankingRow]:
    """GET /candidates/content/ranking — tópicos por investimento declarado."""
    inicio, fim = day_bounds(period.start, period.end)
    stmt = (
        select(
            DocumentoTopico.topico_id.label("topico_id"),
            AlvoColeta.entidade_codigo.label("entidade"),
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "lower_bound")), 0).label("min"),
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "upper_bound")), 0).label("max"),
            func.count().label("ads"),
        )
        .select_from(Documento)
        .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
        .join(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
        .join(Topico, Topico.id == DocumentoTopico.topico_id)
        .where(
            Documento.publicado_em >= inicio,
            Documento.publicado_em < fim,
            AlvoColeta.ativo.is_(True),
            Topico.modelo_id.in_(vigente_model_ids(TipoModeloEnum.topico)),
        )
        .group_by(
            DocumentoTopico.topico_id,
            AlvoColeta.entidade_codigo,
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
        )
    )
    if entity_ids:
        stmt = stmt.where(AlvoColeta.entidade_codigo.in_(entity_ids))
    stmt = _ads_filter(stmt, platforms)

    rows = (await session.execute(stmt)).all()
    linhas = [
        AdTopicRankingRow(
            topic=Topic(
                id=compose_topic_id(row.topico_id, row.entidade),
                entity_id=row.entidade,
                label=topic_label(row.rotulo, row.numero, row.palavras_chave),
                weight=0.0,
                tags=list(row.palavras_chave or []),
                emergent=topic_emergent(row.revisado),
            ),
            investment_min_brl=int(row.min),
            investment_max_brl=int(row.max),
            ads_count=int(row.ads),
        )
        for row in rows
    ]
    linhas.sort(key=lambda r: r.investment_min_brl + r.investment_max_brl, reverse=True)
    return linhas[:limit] if limit else linhas


async def ad_candidate_breakdown(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    platforms: list[MetaAdPlatform],
) -> list[AdCandidateBreakdownRow]:
    """GET /candidates/content/by-candidate — investimento por candidato."""
    inicio, fim = day_bounds(period.start, period.end)
    stmt = (
        select(
            Entidade.codigo,
            Entidade.nome_exibicao,
            Entidade.partido,
            Entidade.foto,
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "lower_bound")), 0).label("min"),
            func.coalesce(func.sum(ad_bound_sql(AD_SPEND_KEY, "upper_bound")), 0).label("max"),
            func.count(Documento.id).label("ads"),
        )
        .select_from(Entidade)
        .outerjoin(
            AlvoColeta,
            (AlvoColeta.entidade_codigo == Entidade.codigo)
            & AlvoColeta.ativo.is_(True)
            & (AlvoColeta.fonte_codigo == fonte_de(Network.META_ADS)),
        )
        .outerjoin(
            Documento,
            (Documento.alvo_coleta_id == AlvoColeta.id)
            & (Documento.tipo == TipoDocumentoEnum.anuncio)
            & (Documento.publicado_em >= inicio)
            & (Documento.publicado_em < fim),
        )
        .where(Entidade.ativa.is_(True))
        .group_by(Entidade.codigo, Entidade.nome_exibicao, Entidade.partido, Entidade.foto)
    )
    if entity_ids:
        stmt = stmt.where(Entidade.codigo.in_(entity_ids))

    rows = (await session.execute(stmt)).all()
    linhas = [
        AdCandidateBreakdownRow(
            entity=Entity(
                id=row.codigo,
                name=row.nome_exibicao,
                role=row.partido or "",
                aliases=[],
                photo_url=row.foto,
            ),
            investment_min_brl=int(row.min),
            investment_max_brl=int(row.max),
            ads_count=int(row.ads),
        )
        for row in rows
    ]
    linhas.sort(key=lambda r: r.investment_min_brl + r.investment_max_brl, reverse=True)
    return linhas


async def publication_comments(
    session: AsyncSession,
    documento_id: int,
    sentiment: SentimentLabel | None = None,
    sort: str = "top",
    limit: int = 20,
    offset: int = 0,
):
    """GET /documents/{id}/comments — thread do painel "Ver comentários".

    A thread é montada pelo vínculo pai no JSONB (`parentId` no YouTube, `parent_id`
    no Reddit) apontando para o `id_nativo` da publicação: o schema não tem coluna de
    documento-pai, embora `tipo` distinga `comentario` de `resposta`. **Se o coletor
    não gravar esse campo, a thread volta vazia** — é o único endpoint que depende de
    uma chave do JSONB que não tem alternativa.

    `contextLabel` sai de `alvo_coleta.canal`, que é o subreddit ou o canal de verdade.

    `totalBySentiment` é sempre sobre a thread inteira, não sobre o recorte filtrado:
    são os números dos chips ("Negativo 720"), que não podem mudar quando o usuário
    clica num deles.
    """
    from ..schemas.domain import PublicationComment
    from ..schemas.responses import PublicationCommentsResult

    pai = (
        await session.execute(
            select(
                Documento.id,
                Documento.id_nativo,
                Documento.texto,
                Documento.publicado_em,
                Documento.metadados,
                AlvoColeta.entidade_codigo.label("entidade"),
                AlvoColeta.fonte_codigo.label("fonte"),
                AlvoColeta.canal.label("canal"),
                DocumentoTopico.topico_id.label("topico_id"),
                Sentimento.polaridade.label("polaridade"),
                Topico.rotulo,
                Topico.numero,
                Topico.palavras_chave,
                Topico.revisado,
            )
            .select_from(Documento)
            .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
            .outerjoin(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
            .outerjoin(Topico, Topico.id == DocumentoTopico.topico_id)
            .outerjoin(
                Sentimento,
                (Sentimento.documento_id == Documento.id)
                & Sentimento.modelo_id.in_(vigente_model_ids(TipoModeloEnum.sentimento)),
            )
            .where(Documento.id == documento_id)
            .limit(1)
        )
    ).first()

    if pai is None:
        return None

    parent_ref = func.coalesce(
        *[Documento.metadados[k].astext for k in PARENT_KEYS]
    )
    filhos_stmt = (
        select(
            Documento.id,
            Documento.texto,
            Documento.publicado_em,
            Documento.metadados,
            Sentimento.polaridade.label("polaridade"),
        )
        .select_from(Documento)
        .outerjoin(
            Sentimento,
            (Sentimento.documento_id == Documento.id)
            & Sentimento.modelo_id.in_(vigente_model_ids(TipoModeloEnum.sentimento)),
        )
        .where(
            parent_ref == pai.id_nativo,
            Documento.tipo.in_(
                (TipoDocumentoEnum.comentario, TipoDocumentoEnum.resposta)
            ),
        )
    )
    filhos = (await session.execute(filhos_stmt)).all()

    totais = TopicSentiment()
    for f in filhos:
        rotulo = POLARIDADE_PARA_LABEL.get(f.polaridade)
        if rotulo == SentimentLabel.NEGATIVE:
            totais.negative += 1
        elif rotulo == SentimentLabel.POSITIVE:
            totais.positive += 1
        else:
            totais.neutral += 1

    agora = datetime.now(UTC)
    comentarios = [
        PublicationComment(
            id=str(f.id),
            text=f.texto or "",
            sentiment=POLARIDADE_PARA_LABEL.get(f.polaridade, SentimentLabel.NEUTRAL),
            votes=int(first_key(f.metadados or {}, ENGAGEMENT_KEYS) or 0),
            hours_ago=max(0, int((agora - f.publicado_em).total_seconds() // 3600)),
        )
        for f in filhos
    ]

    if sentiment is not None:
        comentarios = [c for c in comentarios if c.sentiment == sentiment]
    comentarios.sort(
        key=(lambda c: -c.votes) if sort == "top" else (lambda c: c.hours_ago)
    )

    entidade = (
        await session.execute(
            select(
                Entidade.codigo, Entidade.nome_exibicao, Entidade.partido, Entidade.foto
            ).where(Entidade.codigo == pai.entidade)
        )
    ).first()

    contexto = canal_label(
        pai.fonte, pai.canal or "", entidade.nome_exibicao if entidade else None
    )

    documento = _build_document(pai)
    if documento is None:
        return None

    return PublicationCommentsResult(
        document=documento,
        topic=Topic(
            id=compose_topic_id(pai.topico_id, pai.entidade) if pai.topico_id else "",
            entity_id=pai.entidade,
            label=topic_label(pai.rotulo, pai.numero or 0, pai.palavras_chave),
            weight=0.0,
            tags=list(pai.palavras_chave or []),
            emergent=topic_emergent(pai.revisado),
        ),
        entity=(
            Entity(
                id=entidade.codigo,
                name=entidade.nome_exibicao,
                role=entidade.partido or "",
                aliases=[],
                photo_url=entidade.foto,
            )
            if entidade
            else None
        ),
        context_label=contexto,
        total_by_sentiment=totais,
        total_filtered=len(comentarios),
        comments=comentarios[offset : offset + limit],
    )
