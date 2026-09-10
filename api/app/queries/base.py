"""Base das consultas analíticas.

Todo número do painel sai de uma mesma junção: documento → alvo_coleta (que dá a
entidade e a fonte) → documento_topico → sentimento. Este módulo monta essa junção
com os filtros aplicados; os outros módulos de `queries/` só agregam por cima.

Duas decisões de leitura ficam registradas aqui porque mudam os números na tela:

**Tópico é partido por entidade.** No banco, `topico → modelo → fonte`: o modelo é
por rede, e um tópico pode conter documentos de mais de um candidato. O front, porém,
assume que todo tópico pertence a um candidato só (`Topic.entityId`, ver
src/types/topic.ts). Em vez de escolher a entidade dominante e perder o resto, cada
par (tópico, entidade) vira um tópico do ponto de vista da API, com id composto
`{topico_id}-{entidade_codigo}`. Nada é descartado e a premissa do front passa a
valer. `Topic.weight` — "share of the entity's own documents" — cai naturalmente.

**`video` não é menção.** Vídeo do canal oficial é o container do qual se coletam os
comentários, não fala do público. Contá-lo inflaria o volume orgânico com conteúdo do
próprio candidato, que é justamente o que o painel separa em outra tela.
"""

from datetime import date as Date
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Date as SQLDate
from sqlalchemy import Select, Text, cast, func, select
from sqlalchemy.sql.elements import ColumnElement

from ..models import (
    AlvoColeta,
    Documento,
    DocumentoTopico,
    Modelo,
    PolaridadeEnum,
    Sentimento,
    StatusModeloEnum,
    TipoDocumentoEnum,
    TipoModeloEnum,
    Topico,
)
from ..schemas.domain import Network, fonte_de

TIMEZONE = "America/Sao_Paulo"
ZONE = ZoneInfo(TIMEZONE)


def day_bounds(start: Date, end: Date) -> tuple[datetime, datetime]:
    """Intervalo de datas locais → instantes absolutos `[início, fim)`.

    O filtro precisa ser sobre `documento.publicado_em` cru, sem função em volta:
    `CAST(timezone(...) AS DATE) >= :start` é expressão sobre a coluna e impede o
    planner de usar `idx_documento_publicado`, o que faz cada request varrer a tabela
    inteira. Convertendo os limites aqui, a comparação vira `publicado_em >= :ts`,
    que usa o índice.

    O limite superior é exclusivo (`end` + 1 dia) porque `end` é um dia inteiro,
    não um instante.
    """
    inicio = datetime.combine(start, time.min, tzinfo=ZONE)
    fim = datetime.combine(end + timedelta(days=1), time.min, tzinfo=ZONE)
    return inicio, fim


TIPOS_MENCAO = (
    TipoDocumentoEnum.post,
    TipoDocumentoEnum.comentario,
    TipoDocumentoEnum.resposta,
    TipoDocumentoEnum.anuncio,
)

TOPIC_ID_SEPARATOR = "-"


def compose_topic_id(topico_id: int, entidade_codigo: str) -> str:
    """`123` + `flavio-bolsonaro` → `123-flavio-bolsonaro`."""
    return f"{topico_id}{TOPIC_ID_SEPARATOR}{entidade_codigo}"


def parse_topic_id(topic_id: str) -> tuple[int, str] | None:
    """Inverso de `compose_topic_id`. `None` quando o id não tem o formato esperado.

    Corta na primeira ocorrência do separador: o código da entidade também pode
    conter `-` (`flavio-bolsonaro`), o id numérico não.
    """
    numero, _, entidade = topic_id.partition(TOPIC_ID_SEPARATOR)
    if not numero.isdigit() or not entidade:
        return None
    return int(numero), entidade


def composed_topic_id_column() -> ColumnElement[str]:
    """Expressão SQL do id composto, para agrupar/selecionar direto na query."""
    return (
        cast(DocumentoTopico.topico_id, Text)
        + TOPIC_ID_SEPARATOR
        + AlvoColeta.entidade_codigo
    ).label("topic_id")


def vigente_model_ids(tipo: TipoModeloEnum, day: Date | None = None, day_fallback: bool = True) -> Select:
    """Ids dos modelos vigentes de um tipo. Pode ser mais de um — há um modelo de
    tópicos por rede (`modelo.fonte_codigo`).

    A modelagem diária grava um `modelo` por dia (`janela_inicio == janela_fim ==
    aquele dia`), todos com status=vigente ao mesmo tempo — sem um `day`, esta função
    juntaria os tópicos de todo dia já carregado numa pilha só.

    Com `day` e `day_fallback=True` (padrão), pega o modelo mais recente cuja janela
    termina em `day` OU ANTES - não exige bater o dia exato. Pensado pra telas sem um
    dia explicitamente escolhido pelo usuário (ex.: catalog.py, que sempre usa "hoje"
    como âncora só porque precisa de alguma) - aí cair num dia próximo é melhor que
    voltar vazio.

    Com `day_fallback=False`, exige bater o dia exato - sem esse emprestado, um dia
    sem modelo simplesmente não aparece. Usado onde o usuário escolheu esse dia de
    forma explícita (ranking/calendário de tópicos, clicando num ponto do gráfico):
    mostrar dado de outro dia ali, sem avisar, é enganoso - visto ao vivo (dia
    05/09 sem modelo mostrando os tópicos de 03/09 como se fossem do dia clicado).

    Um modelo sem janela (`janela_inicio` nulo - o modelo de sentimento, ou um modelo
    antigo não diário) sempre casa, já que não participa desse recorte por dia.
    """
    if day is None:
        return select(Modelo.id).where(
            Modelo.tipo == tipo, Modelo.status == StatusModeloEnum.vigente
        )

    if not day_fallback:
        return select(Modelo.id).where(
            Modelo.tipo == tipo, Modelo.status == StatusModeloEnum.vigente,
            (Modelo.janela_inicio.is_(None))
            | ((Modelo.janela_inicio <= day) & (Modelo.janela_fim >= day)),
        )

    # Critério único que cobre os dois casos: pega o modelo com o MAIOR janela_inicio
    # que ainda seja <= day. Se `day` cai DENTRO da janela de um modelo (janela_inicio
    # <= day <= janela_fim), esse é o modelo com o maior janela_inicio <= day entre
    # todos (o próximo modelo só começa depois de `day`, já que janelas não se
    # sobrepõem) - o "fallback" nunca entra em ação nesse caso, só devolve o modelo
    # certo. Se `day` cai num buraco (nenhum modelo cobre - semana sem volume
    # suficiente pra gerar modelo), cai naturalmente no modelo anterior mais recente.
    #
    # Antes disso usava max(janela_fim) com janela_fim <= day - certo só quando
    # janela_inicio == janela_fim (modelo diário); com modelo semanal
    # (janela_fim = janela_inicio+6), um dia no MEIO da semana (ex: dia 5 de uma janela
    # que só fecha no dia 6) tinha janela_fim > day e o modelo nunca era encontrado -
    # bug real, descoberto via /topics/{id} devolvendo 404 pra tópicos existentes.
    entidade_expr = Modelo.parametros["entidade_codigo"].astext
    ultimo_inicio_por_entidade = (
        select(
            Modelo.fonte_codigo.label("fonte_codigo"),
            entidade_expr.label("entidade"),
            func.max(Modelo.janela_inicio).label("ultimo_inicio"),
        )
        .where(
            Modelo.tipo == tipo, Modelo.status == StatusModeloEnum.vigente,
            Modelo.janela_inicio.isnot(None), Modelo.janela_inicio <= day,
        )
        .group_by(Modelo.fonte_codigo, entidade_expr)
        .subquery()
    )
    return (
        select(Modelo.id)
        .outerjoin(
            ultimo_inicio_por_entidade,
            (Modelo.fonte_codigo == ultimo_inicio_por_entidade.c.fonte_codigo)
            & (entidade_expr == ultimo_inicio_por_entidade.c.entidade),
        )
        .where(
            Modelo.tipo == tipo, Modelo.status == StatusModeloEnum.vigente,
            (Modelo.janela_inicio.is_(None))
            | (Modelo.janela_inicio == ultimo_inicio_por_entidade.c.ultimo_inicio),
        )
    )


def local_date_column() -> ColumnElement[Date]:
    return cast(func.timezone(TIMEZONE, Documento.publicado_em), SQLDate)


def local_hour_column() -> ColumnElement[datetime]:
    """Timestamp truncado pra hora, em horário local - granularidade diária não faz
    mais sentido no drill-down de um tópico específico (a modelagem é por dia agora,
    então um tópico inteiro já vive dentro de um único dia calendário - ver
    pipeline/weekly_topics.py em pave-tm); "evolução ao longo do dia" só é informativo
    quebrando por hora."""
    return func.date_trunc("hour", func.timezone(TIMEZONE, Documento.publicado_em))


def today_local() -> Date:
    """Today's date in TIMEZONE - the default `day` for callers with no date/period
    context of their own (e.g. catalog.py's candidate-topics modal), so they show
    today's daily topic model instead of every day's ever loaded (see
    vigente_model_ids)."""
    return datetime.now(ZoneInfo(TIMEZONE)).date()


def sentiment_count(polaridade: PolaridadeEnum) -> ColumnElement[int]:
    return func.count().filter(Sentimento.polaridade == polaridade)


NEGATIVE = sentiment_count(PolaridadeEnum.negativo)
NEUTRAL = sentiment_count(PolaridadeEnum.neutro)
POSITIVE = sentiment_count(PolaridadeEnum.positivo)


def fact_select(
    *columns: ColumnElement,
    start: Date,
    end: Date,
    entity_ids: list[str] | None = None,
    networks: list[Network] | None = None,
    with_topic: bool = True,
    with_sentiment: bool = True,
    topic_day: Date | None = None,
    topic_day_fallback: bool = True,
) -> Select:
    """Monta a junção-base já filtrada.

    `entity_ids`/`networks` vazios ou `None` não filtram — é o contrato "lista vazia
    significa todos" que o front usa em toda a querystring.

    `end` é inclusivo: o filtro usa `< end + 1 dia` sobre o timestamp convertido para
    horário local, para não perder o que foi publicado no próprio dia final.

    `topic_day` escolhe qual modelo diário de tópicos usar (ver vigente_model_ids) -
    independente de `start`/`end`, que filtram os documentos em si, não a taxonomia de
    tópicos usada para agrupá-los.

    `topic_day_fallback` decide se um dia sem modelo próprio pode emprestar o do
    último dia disponível: `True` (padrão) para uma agregação sem dia explícito (ex.:
    "Top 10 tópicos" da Visão Geral, sobre todo o período retido) - aí é melhor mostrar
    algo que nada. `False` para telas onde o usuário escolheu esse dia explicitamente
    (ranking/calendário de tópicos, clicando num ponto do gráfico) - aí mostrar o dia
    errado sem avisar é enganoso (visto ao vivo: um dia sem modelo mostrando os
    tópicos de outro dia como se fossem dele).
    """
    stmt = select(*columns).select_from(Documento)
    stmt = stmt.join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)

    if with_topic:
        stmt = stmt.join(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
        stmt = stmt.join(Topico, Topico.id == DocumentoTopico.topico_id)
        stmt = stmt.where(
            Topico.modelo_id.in_(
                vigente_model_ids(TipoModeloEnum.topico, day=topic_day, day_fallback=topic_day_fallback)
            )
        )

    if with_sentiment:
        stmt = stmt.outerjoin(
            Sentimento,
            (Sentimento.documento_id == Documento.id)
            & Sentimento.modelo_id.in_(vigente_model_ids(TipoModeloEnum.sentimento)),
        )

    # Sempre filtra documento por start/end, com ou sem topic_day: `topic_day` só
    # decide QUAL MODELO (taxonomia de tópicos) usar - não substitui o filtro de data
    # real. Antes, com topic_day setado, pulava esse filtro (comentário removido dizia
    # que o join com documento_topico/topico já bastava, "já que os documentos daquele
    # modelo diário são só os do próprio dia") - certo enquanto o modelo era diário
    # (janela_inicio == janela_fim), mas com o modelo semanal (janela_fim =
    # janela_inicio+6) os documentos de um modelo cobrem até 7 dias diferentes; sem
    # este filtro, `mentions` somava a semana INTEIRA pra qualquer dia pedido dentro
    # dela, em vez do volume real daquele dia - bug real, visto ao vivo no painel
    # "Tópicos deste dia" mostrando as mesmas contagens grandes em todo dia da semana,
    # incluindo dias sem nenhum documento daquele tópico.
    inicio, fim = day_bounds(start, end)
    stmt = stmt.where(Documento.publicado_em >= inicio, Documento.publicado_em < fim)
    stmt = stmt.where(Documento.tipo.in_(TIPOS_MENCAO))
    stmt = stmt.where(AlvoColeta.ativo.is_(True))

    if entity_ids:
        stmt = stmt.where(AlvoColeta.entidade_codigo.in_(entity_ids))
    if networks:
        stmt = stmt.where(AlvoColeta.fonte_codigo.in_([fonte_de(n) for n in networks]))

    return stmt


def canal_label(fonte_codigo: str, canal: str, nome_entidade: str | None, rotulo: str | None = None) -> str:
    """Rótulo legível para `alvo_coleta.canal`.

    O valor cru só é apresentável no Reddit. No YouTube `canal` é o channel_id
    (`UCvO2BExvkAbGMsTGnEnI_Ng`) e no Meta é o page_id numérico — ver
    `seed_alvo_coleta` em pipelines/etl/seed_entidades.py.

    `rotulo` é o nome real do canal de notícia (ex: "Jovem Pan News"), populado em
    `alvo_coleta.rotulo` pelo seed a partir de entities.yaml/youtube.canais_noticia -
    é o que diferencia colunas de canais distintos do mesmo candidato na grade
    "Tópicos por canal" (antes de existir essa coluna, toda coluna de um candidato
    colapsava em "Canal do X", já que só o nome do candidato era usado). Meta não tem
    canal de fato (é a própria página do candidato) - "Página de X" já é correto e
    continua caindo nesse fallback mesmo com `rotulo` implementado.

    O Reddit é gravado sem o prefixo (`brasil`), enquanto a UI fala em `r/brasil`.
    """
    if fonte_codigo == "reddit":
        limpo = canal.removeprefix("r/")
        return f"r/{limpo}"
    if fonte_codigo == "youtube":
        return rotulo or (f"Canal do {nome_entidade}" if nome_entidade else canal)
    if fonte_codigo == "meta":
        return f"Página de {nome_entidade}" if nome_entidade else canal
    return canal


TOPIC_LABEL_KEYWORDS = 3


def _capitalize_first(texto: str) -> str:
    """Só a primeira letra maiúscula - preserva o resto (nome próprio ou sigla no
    meio do rótulo não pode virar minúscula)."""
    return texto[:1].upper() + texto[1:] if texto else texto


def topic_label(rotulo: str | None, numero: int, palavras_chave) -> str:
    """Rótulo de um tópico, com fallback útil.

    `load_topicos.py` grava `palavras_chave` e `tamanho`, mas nunca `rotulo` — a
    rotulagem revisada é etapa manual e ainda não aconteceu. Cair em "Tópico 7" seria
    exatamente o que a página de Metodologia descarta ("'Tópico 37' não serve para o
    painel"), então usamos as primeiras palavras-chave, que ao menos dizem do que o
    tópico trata. Sempre com maiúscula na primeira letra: o LLM que gera `rotulo` não
    garante isso, e a lista de palavras-chave vem toda em minúsculo do pipeline.
    """
    if rotulo:
        return _capitalize_first(rotulo)
    palavras = list(palavras_chave or [])[:TOPIC_LABEL_KEYWORDS]
    if palavras:
        return _capitalize_first(" · ".join(palavras))
    return f"Tópico {numero}"


def topic_emergent(revisado: bool | None) -> bool | None:
    """Sempre `None` hoje — não há sinal de "tópico novo" no banco.

    Chegamos a usar `topico.revisado` como proxy, mas `load_topicos.py` nunca escreve
    essa coluna: ela fica no default `false` para todas as linhas, o que marcaria
    *todo* tópico como emergente na UI. Sem histórico entre versões de modelo (o
    schema não guarda), a resposta honesta é não afirmar nada — a badge some e o
    filtro "emergentes" volta vazio, em vez de mentir em todas as linhas.
    """
    return None
