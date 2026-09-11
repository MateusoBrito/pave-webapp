"""Ranking, detalhe e distribuição de tópicos.

Cada linha aqui é um par (tópico do modelo, entidade) — ver a docstring de
`queries/base.py` para por que o tópico é partido por entidade.
"""


from datetime import date as Date
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import Period
from ..models import (
    AlvoColeta,
    Documento,
    DocumentoTopico,
    Entidade,
    Modelo,
    StatusModeloEnum,
    TipoModeloEnum,
    Topico,
)
from ..schemas.domain import Network, Topic, TopicSentiment, fonte_de, network_de
from ..schemas.responses import (
    SubdivisionColumn,
    SubdivisionMatrix,
    SubdivisionRow,
    TopicCalendarDay,
    TopicCalendarEntity,
    TopicCalendarResult,
    TopicDetail,
    TopicRankingRow,
)
from .base import (
    NEGATIVE,
    NEUTRAL,
    POSITIVE,
    TIPOS_MENCAO,
    canal_label,
    compose_topic_id,
    fact_select,
    local_date_column,
    topic_emergent,
    topic_label,
)


async def _topic_vigencia(
    session: AsyncSession, topico_id: int, entidade: str, networks: list[Network],
) -> Period | None:
    """Janela real de atividade do tópico: do primeiro ao último documento atribuído a
    ele, dentro do escopo de rede. Não recebe período de fora - vigência é justamente
    descobrir esse intervalo, não um recorte imposto pelo cliente."""
    dia = local_date_column()
    stmt = (
        select(func.min(dia), func.max(dia))
        .select_from(Documento)
        .join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)
        .join(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
        .where(
            DocumentoTopico.topico_id == topico_id,
            AlvoColeta.entidade_codigo == entidade,
            Documento.tipo.in_(TIPOS_MENCAO),
            AlvoColeta.ativo.is_(True),
        )
    )
    if networks:
        stmt = stmt.where(AlvoColeta.fonte_codigo.in_([fonte_de(n) for n in networks]))
    inicio, fim = (await session.execute(stmt)).first() or (None, None)
    if inicio is None:
        return None
    return Period(start=inicio, end=fim)


def _build_topic(row, weight: float) -> Topic:
    return Topic(
        id=compose_topic_id(row.topico_id, row.entidade),
        entity_id=row.entidade,
        label=topic_label(row.rotulo, row.numero, row.palavras_chave),
        weight=weight,
        tags=list(row.palavras_chave or []),
        emergent=topic_emergent(row.revisado),
    )


async def _ranking_rows(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    topico_id: int | None = None,
    day_fallback: bool = True,
) -> list:
    """Agregação por (tópico, entidade) com sentimento e rede dominante."""
    stmt = fact_select(
        DocumentoTopico.topico_id.label("topico_id"),
        AlvoColeta.entidade_codigo.label("entidade"),
        Topico.rotulo,
        Topico.numero,
        Topico.palavras_chave,
        Topico.revisado,
        func.count().label("mentions"),
        NEGATIVE.label("negative"),
        NEUTRAL.label("neutral"),
        POSITIVE.label("positive"),
        func.mode().within_group(AlvoColeta.fonte_codigo).label("fonte_dominante"),
        func.max(local_date_column()).label("ultima_data"),
        start=period.start,
        end=period.end,
        entity_ids=entity_ids,
        networks=networks,
        # A modelagem diária grava um conjunto de tópicos por dia (ver vigente_model_ids
        # em base.py) - sem isso, o ranking juntaria tópicos de todo dia já carregado
        # numa lista só. Usa o fim do período já selecionado no front (o mesmo filtro
        # que já existe na tela) como "de qual dia" mostrar os tópicos. `day_fallback`
        # varia por chamador: a Visão Geral (sem dia explícito, período de meses) quer
        # o fallback pro último dia disponível; a tela de tópicos (dia escolhido
        # clicando no gráfico) não - ver topic_ranking().
        topic_day=period.end,
        topic_day_fallback=day_fallback,
    )
    if topico_id is not None:
        stmt = stmt.where(DocumentoTopico.topico_id == topico_id)
    stmt = stmt.group_by(
        DocumentoTopico.topico_id,
        AlvoColeta.entidade_codigo,
        Topico.rotulo,
        Topico.numero,
        Topico.palavras_chave,
        Topico.revisado,
    )
    return (await session.execute(stmt)).all()


async def topic_ranking(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    networks: list[Network],
    limit: int | None = None,
    day_fallback: bool = True,
) -> list[TopicRankingRow]:
    """GET /topics/ranking.

    `variationPct` compara com o período imediatamente anterior de mesma duração
    (`Period.previous()`). Tópico sem menção no período anterior fica com 0% em vez de
    infinito — mesmo tratamento do mock, e evita "+∞%" na tabela.

    Quem chama já restringe `networks` às orgânicas: Meta Ads é conteúdo do próprio
    candidato e não entra em ranking de conversa pública.

    `day_fallback` (padrão True): a Visão Geral chama este endpoint sem um dia
    escolhido pelo usuário (é uma agregação de meses, "Top 10 tópicos do período") -
    aí cair no último dia disponível é melhor que voltar vazio. A tela de tópicos
    ("O que os usuários comentam?"), onde o usuário clica num dia específico do
    gráfico, passa `day_fallback=False` - ver TopicsPage/routers/topics.py.
    """
    atual = await _ranking_rows(session, period, entity_ids, networks, day_fallback=day_fallback)
    anterior = await _ranking_rows(
        session, period.previous(), entity_ids, networks, day_fallback=day_fallback,
    )

    antes = {(row.topico_id, row.entidade): row.mentions for row in anterior}
    total_por_entidade: dict[str, int] = {}
    for row in atual:
        total_por_entidade[row.entidade] = total_por_entidade.get(row.entidade, 0) + row.mentions

    linhas: list[TopicRankingRow] = []
    for row in atual:
        if row.mentions <= 0:
            continue
        anterior_mentions = antes.get((row.topico_id, row.entidade), 0)
        variacao = (
            ((row.mentions - anterior_mentions) / anterior_mentions * 100)
            if anterior_mentions > 0
            else 0.0
        )
        total = total_por_entidade.get(row.entidade) or 1
        linhas.append(
            TopicRankingRow(
                topic=_build_topic(row, row.mentions / total),
                mentions=row.mentions,
                variation_pct=variacao,
                dominant_network=network_de(row.fonte_dominante) or Network.REDDIT,
                sentiment=TopicSentiment(
                    negative=row.negative or 0,
                    neutral=row.neutral or 0,
                    positive=row.positive or 0,
                ),
            )
        )

    linhas.sort(key=lambda r: r.mentions, reverse=True)
    return linhas[:limit] if limit else linhas


async def topic_detail(
    session: AsyncSession,
    topic_id: str,
    topico_id: int,
    entidade: str,
    networks: list[Network],
) -> TopicDetail | None:
    """GET /topics/{id} — cabeçalho do drill-down.

    Não recebe período: sempre calcula sobre a vigência do próprio tópico (primeiro ao
    último documento atribuído a ele) - ver `_topic_vigencia`. `sharePct` é sobre o
    total de menções de **todos** os tópicos nessa mesma janela, com o mesmo escopo de
    rede — é o que o mock calcula e o que a tela rotula como "participação no período".
    """
    period = await _topic_vigencia(session, topico_id, entidade, networks)
    if period is None:
        return None

    linhas = await _ranking_rows(session, period, [entidade], networks, topico_id=topico_id)
    if not linhas:
        return None
    row = linhas[0]

    total_stmt = fact_select(
        func.count(),
        start=period.start,
        end=period.end,
        entity_ids=[],
        networks=networks,
        with_sentiment=False,
    )
    total = (await session.execute(total_stmt)).scalar_one() or 1

    dia = local_date_column().label("dia")
    pico_stmt = (
        fact_select(
            dia,
            func.count().label("mentions"),
            start=period.start,
            end=period.end,
            entity_ids=[entidade],
            networks=networks,
            with_sentiment=False,
        )
        .where(DocumentoTopico.topico_id == topico_id)
        .group_by(dia)
        .order_by(func.count().desc())
        .limit(1)
    )
    pico = (await session.execute(pico_stmt)).first()

    return TopicDetail(
        topic=_build_topic(row, row.mentions / total if total else 0.0),
        mentions=row.mentions,
        share_pct=row.mentions / total * 100,
        period_start=period.start,
        period_end=period.end,
        sentiment=TopicSentiment(
            negative=row.negative or 0,
            neutral=row.neutral or 0,
            positive=row.positive or 0,
        ),
        peak_date=pico.dia if pico else None,
        dominant_network=network_de(row.fonte_dominante) or Network.REDDIT,
    )


async def topics_by_subdivision(
    session: AsyncSession,
    period: Period,
    entity_ids: list[str],
    network: Network,
) -> SubdivisionMatrix:
    """GET /topics/by-subdivision — "Tópicos por subreddit" / "Tópicos por canal".

    `alvo_coleta.canal` é a subdivisão real (o subreddit no Reddit, o canal no
    YouTube), então isto é contagem de verdade. O mock repartia o total do tópico
    entre 8 subreddits fixos por um peso pseudoaleatório, só para ilustrar.
    """
    stmt = (
        fact_select(
            DocumentoTopico.topico_id.label("topico_id"),
            AlvoColeta.entidade_codigo.label("entidade"),
            AlvoColeta.canal.label("canal"),
            AlvoColeta.rotulo.label("canal_rotulo"),
            AlvoColeta.fonte_codigo.label("fonte"),
            Entidade.nome_exibicao.label("nome_entidade"),
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
            func.count().label("mentions"),
            start=period.start,
            end=period.end,
            entity_ids=entity_ids,
            networks=[network],
            with_sentiment=False,
            # Sem isso, junta os tópicos de todo dia já carregado numa pilha só (visto
            # ao vivo: 10 tópicos somados de 2 dias diferentes, quando o dia
            # selecionado só tem 5). Esta tela sempre parte de um dia escolhido
            # explicitamente (ver TopicsPage) - sem fallback pra outro dia.
            topic_day=period.end,
            topic_day_fallback=False,
        )
        .join(Entidade, Entidade.codigo == AlvoColeta.entidade_codigo)
        .group_by(
            DocumentoTopico.topico_id,
            AlvoColeta.entidade_codigo,
            AlvoColeta.canal,
            AlvoColeta.rotulo,
            AlvoColeta.fonte_codigo,
            Entidade.nome_exibicao,
            Topico.rotulo,
            Topico.numero,
            Topico.palavras_chave,
            Topico.revisado,
        )
    )
    rows = (await session.execute(stmt)).all()

    rotulos = {
        row.canal: canal_label(row.fonte, row.canal, row.nome_entidade, row.canal_rotulo) for row in rows
    }
    canais = sorted(rotulos, key=lambda c: rotulos[c])
    por_topico: dict[tuple[int, str], dict] = {}
    for row in rows:
        chave = (row.topico_id, row.entidade)
        entrada = por_topico.setdefault(chave, {"row": row, "valores": {}, "total": 0})
        entrada["valores"][row.canal] = entrada["valores"].get(row.canal, 0) + row.mentions
        entrada["total"] += row.mentions

    total_geral = sum(e["total"] for e in por_topico.values()) or 1
    linhas = [
        SubdivisionRow(
            topic=_build_topic(entrada["row"], entrada["total"] / total_geral),
            values={canal: entrada["valores"].get(canal, 0) for canal in canais},
        )
        for entrada in sorted(por_topico.values(), key=lambda e: e["total"], reverse=True)
    ]

    maximo = max((v for linha in linhas for v in linha.values.values()), default=0)
    return SubdivisionMatrix(
        columns=[SubdivisionColumn(key=c, label=rotulos[c]) for c in canais],
        rows=linhas,
        max_value=max(1, maximo),
        unit_label="comentários",
    )


async def topic_calendar(
    session: AsyncSession, entity_ids: list[str], network: Network, start: Date, end: Date,
) -> TopicCalendarResult:
    """GET /topics/calendar — um mini-calendário por candidato (ver TopicsCalendarCard
    no front, navegação por mês): o tópico de maior volume de cada dia entre `start` e
    `end` (inclusive), com o volume REAL daquele dia.

    Antes lia direto de `topico.tamanho` (o total do tópico na janela inteira do
    modelo) usando `modelo.janela_fim` como "o dia" - fazia sentido quando a modelagem
    era diária (um modelo por dia, janela_inicio == janela_fim). Com a modelagem
    semanal (pipeline/weekly_topics.py em pave-tm - janela_fim = janela_inicio+6), isso
    só produzia UM ponto por semana (no janela_fim), com o volume da semana inteira
    encaixado nesse único dia - os outros 6 dias ficavam vazios (buraco na linha do
    gráfico) em vez de mostrarem o volume real deles.

    Agora conta documento_topico de verdade, agrupado pelo dia real de publicação
    (local_date_column) - todo dia dentro da janela de um modelo aparece com o volume
    que de fato teve nele. O tópico de maior destaque é calculado por dia (não herdado
    do agregado semanal), mas como o modelo vale pra semana toda, tende a se repetir
    ao longo dela quando um tema domina a semana - sem precisar de lógica extra pra
    isso.

    Um dia sem nenhum documento com tópico vira TopicCalendarDay sem top_label/
    mentions - célula vazia no calendário, não erro (mesma filosofia de "dias vazios
    ficam vazios" do backfill).
    """
    dia_expr = local_date_column().label("dia")
    stmt = fact_select(
        dia_expr,
        AlvoColeta.entidade_codigo.label("entidade"),
        Topico.id.label("topico_id"),
        Topico.rotulo,
        Topico.numero,
        Topico.palavras_chave,
        func.count().label("contagem"),
        start=start, end=end,
        entity_ids=entity_ids, networks=[network],
        with_topic=True, with_sentiment=False,
    ).group_by(dia_expr, AlvoColeta.entidade_codigo, Topico.id, Topico.rotulo, Topico.numero, Topico.palavras_chave)
    rows = (await session.execute(stmt)).all()

    # Por (entidade, dia): soma todas as contagens de tópico = volume real do dia;
    # o tópico com mais menções naquele dia vira o destaque.
    volume_por_dia: dict[tuple[str, Date], int] = {}
    melhor_por_dia: dict[tuple[str, Date], tuple[int, object]] = {}
    for row in rows:
        chave = (row.entidade, row.dia)
        volume_por_dia[chave] = volume_por_dia.get(chave, 0) + row.contagem
        atual = melhor_por_dia.get(chave)
        if atual is None or row.contagem > atual[0]:
            melhor_por_dia[chave] = (row.contagem, row)

    entities_result = []
    for entity_id in entity_ids:
        dias = []
        dia = start
        while dia <= end:
            chave = (entity_id, dia)
            melhor = melhor_por_dia.get(chave)
            if melhor is None:
                dias.append(TopicCalendarDay(date=dia))
            else:
                _, row = melhor
                dias.append(TopicCalendarDay(
                    date=dia,
                    top_label=topic_label(row.rotulo, row.numero, row.palavras_chave),
                    mentions=volume_por_dia[chave],
                ))
            dia += timedelta(days=1)
        entities_result.append(TopicCalendarEntity(entity_id=entity_id, days=dias))

    return TopicCalendarResult(entities=entities_result)
