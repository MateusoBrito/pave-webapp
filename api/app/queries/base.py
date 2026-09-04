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


def vigente_model_ids(tipo: TipoModeloEnum) -> Select:
    """Ids dos modelos vigentes de um tipo. Pode ser mais de um — há um modelo de
    tópicos por rede (`modelo.fonte_codigo`)."""
    return select(Modelo.id).where(
        Modelo.tipo == tipo, Modelo.status == StatusModeloEnum.vigente
    )


def local_date_column() -> ColumnElement[Date]:
    return cast(func.timezone(TIMEZONE, Documento.publicado_em), SQLDate)


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
) -> Select:
    """Monta a junção-base já filtrada.

    `entity_ids`/`networks` vazios ou `None` não filtram — é o contrato "lista vazia
    significa todos" que o front usa em toda a querystring.

    `end` é inclusivo: o filtro usa `< end + 1 dia` sobre o timestamp convertido para
    horário local, para não perder o que foi publicado no próprio dia final.
    """
    stmt = select(*columns).select_from(Documento)
    stmt = stmt.join(AlvoColeta, AlvoColeta.id == Documento.alvo_coleta_id)

    if with_topic:
        stmt = stmt.join(DocumentoTopico, DocumentoTopico.documento_id == Documento.id)
        stmt = stmt.join(Topico, Topico.id == DocumentoTopico.topico_id)
        stmt = stmt.where(Topico.modelo_id.in_(vigente_model_ids(TipoModeloEnum.topico)))

    if with_sentiment:
        stmt = stmt.outerjoin(
            Sentimento,
            (Sentimento.documento_id == Documento.id)
            & Sentimento.modelo_id.in_(vigente_model_ids(TipoModeloEnum.sentimento)),
        )

    inicio, fim = day_bounds(start, end)
    stmt = stmt.where(Documento.publicado_em >= inicio, Documento.publicado_em < fim)
    stmt = stmt.where(Documento.tipo.in_(TIPOS_MENCAO))
    stmt = stmt.where(AlvoColeta.ativo.is_(True))

    if entity_ids:
        stmt = stmt.where(AlvoColeta.entidade_codigo.in_(entity_ids))
    if networks:
        stmt = stmt.where(AlvoColeta.fonte_codigo.in_([fonte_de(n) for n in networks]))

    return stmt


def canal_label(fonte_codigo: str, canal: str, nome_entidade: str | None) -> str:
    """Rótulo legível para `alvo_coleta.canal`.

    O valor cru só é apresentável no Reddit. No YouTube `canal` é o channel_id
    (`UCvO2BExvkAbGMsTGnEnI_Ng`) e no Meta é o page_id numérico — ver
    `seed_alvo_coleta` em pipelines/etl/seed_entidades.py. Mostrar isso como nome de
    coluna na grade "Tópicos por canal" seria ilegível, então caímos no nome do
    candidato, que é o que a tela realmente quer dizer.

    O Reddit é gravado sem o prefixo (`brasil`), enquanto a UI fala em `r/brasil`.
    """
    if fonte_codigo == "reddit":
        limpo = canal.removeprefix("r/")
        return f"r/{limpo}"
    if fonte_codigo == "youtube":
        return f"Canal do {nome_entidade}" if nome_entidade else canal
    if fonte_codigo == "meta":
        return f"Página de {nome_entidade}" if nome_entidade else canal
    return canal


TOPIC_LABEL_KEYWORDS = 3


def topic_label(rotulo: str | None, numero: int, palavras_chave) -> str:
    """Rótulo de um tópico, com fallback útil.

    `load_topicos.py` grava `palavras_chave` e `tamanho`, mas nunca `rotulo` — a
    rotulagem revisada é etapa manual e ainda não aconteceu. Cair em "Tópico 7" seria
    exatamente o que a página de Metodologia descarta ("'Tópico 37' não serve para o
    painel"), então usamos as primeiras palavras-chave, que ao menos dizem do que o
    tópico trata.
    """
    if rotulo:
        return rotulo
    palavras = list(palavras_chave or [])[:TOPIC_LABEL_KEYWORDS]
    if palavras:
        return " · ".join(palavras)
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
