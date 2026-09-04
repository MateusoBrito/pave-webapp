"""Catálogo: entidades, tópicos e status da coleta.

São as consultas sem período — o front as chama uma vez e reaproveita.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (
    AlvoColeta,
    AlvoColetaEstado,
    Documento,
    DocumentoTopico,
    Entidade,
    TipoModeloEnum,
    TipoTermoEnum,
    Topico,
)
from ..schemas.domain import EmergentTopic, Entity, Topic
from ..schemas.responses import CollectionStatus
from .base import (
    TIMEZONE,
    TIPOS_MENCAO,
    compose_topic_id,
    topic_emergent,
    topic_label,
    vigente_model_ids,
)

OUTLIER_TOPIC_NUMBER = -1


async def list_entities(session: AsyncSession) -> list[Entity]:
    """GET /entities.

    `aliases` sai de `alvo_coleta.termo_busca` com tipo **`consulta`**, não `alias`:
    o seed do pipeline (`seed_alvo_coleta`) só emite `canal` (YouTube), `handle`
    (Meta) e `consulta` (Reddit) — nenhuma linha `alias` chega a existir, e filtrar
    por ela devolvia lista vazia sempre. Os termos de busca do Reddit ("Lula",
    "Flavio Bolsonaro") são, na prática, os apelidos cadastrados.

    `role` não tem coluna equivalente: o schema guarda `partido`, que é outra coisa —
    e que o seed nem preenche hoje. Fica vazio até alguém popular a coluna.
    """
    aliases_stmt = (
        select(
            AlvoColeta.entidade_codigo,
            func.array_agg(func.distinct(AlvoColeta.termo_busca)).label("aliases"),
        )
        .where(
            AlvoColeta.tipo == TipoTermoEnum.consulta,
            AlvoColeta.termo_busca != "",
            AlvoColeta.ativo.is_(True),
        )
        .group_by(AlvoColeta.entidade_codigo)
        .subquery()
    )

    stmt = (
        select(
            Entidade.codigo,
            Entidade.nome_exibicao,
            Entidade.partido,
            Entidade.foto,
            aliases_stmt.c.aliases,
        )
        .outerjoin(aliases_stmt, aliases_stmt.c.entidade_codigo == Entidade.codigo)
        .where(Entidade.ativa.is_(True))
        .order_by(Entidade.nome_exibicao)
    )

    rows = (await session.execute(stmt)).all()
    return [
        Entity(
            id=row.codigo,
            name=row.nome_exibicao,
            role=row.partido or "",
            aliases=sorted(row.aliases) if row.aliases else [],
            photo_url=row.foto,
        )
        for row in rows
    ]


async def list_topics(session: AsyncSession) -> list[Topic]:
    """GET /topics — um tópico por par (tópico do modelo, entidade).

    `weight` é a fatia dos documentos **da própria entidade** que caem neste tópico,
    calculada sobre todo o histórico e não sobre o período filtrado: o endpoint não
    recebe período, e o front usa o valor como característica estável do tópico.

    `emergent` usa `topico.revisado` como proxy — um tópico cujo rótulo ainda não
    passou por revisão humana é, por construção, recém-saído do modelo. O schema não
    guarda histórico entre versões de modelo, que seria a leitura exata de "entrou
    agora".
    """
    counts = (
        select(
            DocumentoTopico.topico_id.label("topico_id"),
            AlvoColeta.entidade_codigo.label("entidade"),
            func.count().label("documentos"),
        )
        .select_from(DocumentoTopico)
        .join(Documento, Documento.id == DocumentoTopico.documento_id)
        .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
        .where(Documento.tipo.in_(TIPOS_MENCAO), AlvoColeta.ativo.is_(True))
        .group_by(DocumentoTopico.topico_id, AlvoColeta.entidade_codigo)
        .subquery()
    )

    total_por_entidade = (
        select(
            counts.c.entidade,
            func.sum(counts.c.documentos).label("total"),
        )
        .group_by(counts.c.entidade)
        .subquery()
    )

    stmt = (
        select(
            Topico.id,
            Topico.numero,
            Topico.rotulo,
            Topico.palavras_chave,
            Topico.revisado,
            counts.c.entidade,
            counts.c.documentos,
            total_por_entidade.c.total,
        )
        .select_from(Topico)
        .join(counts, counts.c.topico_id == Topico.id)
        .join(total_por_entidade, total_por_entidade.c.entidade == counts.c.entidade)
        .where(
            Topico.modelo_id.in_(vigente_model_ids(TipoModeloEnum.topico)),
            Topico.numero != OUTLIER_TOPIC_NUMBER,
        )
    )

    rows = (await session.execute(stmt)).all()
    topics = [
        Topic(
            id=compose_topic_id(row.id, row.entidade),
            entity_id=row.entidade,
            label=topic_label(row.rotulo, row.numero, row.palavras_chave),
            weight=(row.documentos / row.total) if row.total else 0.0,
            tags=list(row.palavras_chave or []),
            emergent=topic_emergent(row.revisado),
        )
        for row in rows
    ]
    return sorted(topics, key=lambda t: t.weight, reverse=True)


async def list_emergent_topics(session: AsyncSession) -> list[EmergentTopic]:
    """Cluster de outliers do BERTopic — documentos que ainda não pertencem a tópico
    nenhum. Não têm série temporal, só contagem."""
    stmt = (
        select(Topico.id, Topico.rotulo, Topico.numero, Topico.tamanho)
        .where(
            Topico.modelo_id.in_(vigente_model_ids(TipoModeloEnum.topico)),
            Topico.numero == OUTLIER_TOPIC_NUMBER,
        )
        .order_by(Topico.tamanho.desc().nullslast())
    )
    rows = (await session.execute(stmt)).all()
    return [
        EmergentTopic(
            id=str(row.id),
            label=topic_label(row.rotulo, row.numero, None) if row.rotulo else "Sem tópico definido",
            document_count=row.tamanho or 0,
        )
        for row in rows
    ]


async def collection_status(session: AsyncSession) -> CollectionStatus:
    """GET /collection/status — chip "última coleta" no topo.

    Usa o documento mais recente efetivamente coletado, não `atualizado_em`: o que o
    usuário precisa saber é até quando o painel tem dado, não quando o job rodou.
    """
    stmt = select(
        func.max(func.timezone(TIMEZONE, AlvoColetaEstado.ultimo_publicado_em)),
        func.timezone(TIMEZONE, func.now()),
    )
    ultimo, agora = (await session.execute(stmt)).one()

    if ultimo is None:
        return CollectionStatus(last_collection_date=agora.date(), days_behind=0)

    return CollectionStatus(
        last_collection_date=ultimo.date(),
        days_behind=max(0, (agora.date() - ultimo.date()).days),
    )


async def candidate_registry(session: AsyncSession) -> list[dict]:
    """GET /registry/candidates — lista do modal "Adicionar candidato".

    Diferente de `/entities`, **não** filtra por `ativa`: entidade inativa é justamente
    o que o modal oferece para incluir no acompanhamento. As ativas aparecem como "já
    monitorado".
    """
    stmt = (
        select(
            Entidade.codigo,
            Entidade.nome_exibicao,
            Entidade.ativa,
            func.count()
            .filter(AlvoColeta.tipo == TipoTermoEnum.consulta)
            .label("apelidos"),
            func.count().label("termos"),
        )
        .select_from(Entidade)
        .outerjoin(
            AlvoColeta,
            (AlvoColeta.entidade_codigo == Entidade.codigo) & AlvoColeta.ativo.is_(True),
        )
        .group_by(Entidade.codigo, Entidade.nome_exibicao, Entidade.ativa)
        .order_by(Entidade.nome_exibicao)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "id": row.codigo,
            "name": row.nome_exibicao,
            "apelidos": row.apelidos,
            "termos": row.termos,
            "monitorada": row.ativa,
        }
        for row in rows
    ]
