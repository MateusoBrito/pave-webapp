"""Modelos de resposta — um por endpoint, espelhando as interfaces exportadas por
`src/api/client.ts`.

O front já tipa contra estas formas hoje (contra os mocks); trocar o mock por `fetch`
não deve exigir mudança nenhuma em página ou componente. Os nomes das classes seguem
os nomes das interfaces TS para facilitar o diff.
"""

from datetime import date as Date
from datetime import datetime as DateTime
from enum import Enum

from pydantic import Field

from .base import ApiModel
from .domain import (
    Entity,
    Network,
    PublicationComment,
    SentimentLabel,
    Topic,
    TopicDocument,
    TopicSentiment,
)


class CollectionStatus(ApiModel):
    """GET /collection/status — chip "última coleta" no topo, sempre visível."""

    last_collection_date: Date
    days_behind: int


class CandidateVolumePoint(ApiModel):
    """GET /series/volume — menções diárias por candidato, somado entre tópicos/redes."""

    date: Date
    entity_id: str
    mentions: int


class EntityMentions(ApiModel):
    entity_id: str
    mentions: int


class NetworkMentions(ApiModel):
    """GET /series/by-network — menções por rede, com a divisão por candidato dentro de
    cada barra (gráfico empilhado da Visão Geral)."""

    network: Network
    mentions: int
    by_entity: list[EntityMentions]


class ShareOfVoiceEntry(ApiModel):
    """GET /series/share-of-voice."""

    entity_id: str
    mentions: int
    share: float


class SentimentSeriesPoint(ApiModel):
    """GET /topics/{id}/sentiment-series — série por hora do gráfico empilhado do
    drill-down de tópico. Granularidade por hora, não por dia: um tópico já vive
    inteiro dentro de um único dia (modelagem diária), "date" carrega hora e minuto."""

    date: DateTime
    sentiment: TopicSentiment


class TopicHourlyVolumePoint(ApiModel):
    """GET /topics/{id}/series-by-candidate — evolução por hora do tópico no drill-down
    (não usa CandidateVolumePoint, que é diário e usado por outras telas)."""

    date: DateTime
    entity_id: str
    mentions: int


class OverviewSummary(ApiModel):
    """GET /overview/summary — os KPIs do topo da Visão Geral."""

    total_mentions: int
    delta_pct: float
    organic_sentiment: TopicSentiment
    predominant_sentiment: SentimentLabel
    active_topics: int
    emergent_count: int
    days_covered: int
    total_days: int
    total_networks: int


class HighlightKind(str, Enum):
    TOP_TOPIC = "top_topic"
    NETWORK_GROWTH = "network_growth"


class Highlight(ApiModel):
    """GET /overview/highlights — frases derivadas dos mesmos agregados do ranking e do
    por-rede; sem fonte de dado nova."""

    kind: HighlightKind
    title: str
    description: str


class TopicRankingRow(ApiModel):
    """GET /topics/ranking — tabela da Visão Geral e lista de ranking em Tópicos.

    Exclui Meta Ads sempre: anúncio pago é conteúdo do candidato, não conversa do público.
    """

    topic: Topic
    mentions: int
    variation_pct: float
    dominant_network: Network
    sentiment: TopicSentiment


class TopicDetail(ApiModel):
    """GET /topics/{id} — cabeçalho do drill-down.

    `period_start`/`period_end` são a vigência do tópico (primeiro ao último documento
    atribuído a ele), não um período recebido do cliente - o endpoint não aceita mais
    `from`/`to`. `mentions`/`share_pct`/`sentiment`/`peak_date` já são calculados sobre
    essa janela; o front reusa period_start/end para as demais chamadas do drill-down
    (série, sentimento ao longo do tempo, documentos), garantindo que a página inteira
    olhe pro mesmo intervalo.
    """

    topic: Topic
    mentions: int
    share_pct: float
    sentiment: TopicSentiment
    peak_date: Date | None = None
    dominant_network: Network
    period_start: Date
    period_end: Date


class SubdivisionColumn(ApiModel):
    key: str
    label: str


class SubdivisionRow(ApiModel):
    topic: Topic
    values: dict[str, int]


class SubdivisionMatrix(ApiModel):
    """GET /topics/by-subdivision — "Tópicos por subreddit" / "Tópicos por canal"."""

    columns: list[SubdivisionColumn]
    rows: list[SubdivisionRow]
    max_value: int
    unit_label: str


class TopicMentions(ApiModel):
    topic: Topic
    mentions: int


class ComparisonCandidateSummary(ApiModel):
    """GET /comparison/{entityId}/summary — painel de cada candidato no Comparativo."""

    entity: Entity
    mentions: int
    sentiment: TopicSentiment
    top_topics: list[TopicMentions]
    other_topics_count: int
    other_topics_mentions: int


class CandidateSentimentPoint(ApiModel):
    """GET /comparison/negative-sentiment-series — % negativo por dia, por candidato.
    Meta Ads não tem sentimento; sempre excluído."""

    date: Date
    entity_id: str
    negative_pct: float


class CandidateSentimentSummary(ApiModel):
    """GET /candidates/sentiment — card "Sentimento por candidato", numa rede orgânica só."""

    entity: Entity
    sentiment: TopicSentiment


class CandidateContentSummary(ApiModel):
    """GET /candidates/content-summary — KPIs de "O que os candidatos postam?"."""

    investment_min_brl: int = Field(serialization_alias="investmentMinBRL")
    investment_max_brl: int = Field(serialization_alias="investmentMaxBRL")
    ads_count: int
    active_ads_count: int
    impressions_min_total: int
    impressions_max_total: int


class AdTopicRankingRow(ApiModel):
    """GET /candidates/content/ranking — tópicos por investimento declarado."""

    topic: Topic
    investment_min_brl: int = Field(serialization_alias="investmentMinBRL")
    investment_max_brl: int = Field(serialization_alias="investmentMaxBRL")
    ads_count: int


class AdTopicDetail(ApiModel):
    """GET /candidates/content/topics/{topic_id} — cabeçalho do drill-down de anúncio.

    Drill-down próprio (não reaproveita /topics/{id}): aquele é hard-restrito a redes
    orgânicas via `organic_scope` porque tem seção de sentimento, que anúncio pago não
    tem — ver AdTopicRankingList.tsx.

    `period_start`/`period_end` são a vigência do tópico (primeiro ao último anúncio
    atribuído a ele) - o endpoint não aceita mais `from`/`to`, mesma lógica de TopicDetail.
    """

    topic: Topic
    investment_min_brl: int = Field(serialization_alias="investmentMinBRL")
    investment_max_brl: int = Field(serialization_alias="investmentMaxBRL")
    ads_count: int
    period_start: Date
    period_end: Date


class AdCandidateBreakdownRow(ApiModel):
    """GET /candidates/content/by-candidate."""

    entity: Entity
    investment_min_brl: int = Field(serialization_alias="investmentMinBRL")
    investment_max_brl: int = Field(serialization_alias="investmentMaxBRL")
    ads_count: int


class PublicationCommentsResult(ApiModel):
    """GET /documents/{id}/comments — painel "Ver comentários"."""

    document: TopicDocument
    topic: Topic
    entity: Entity | None = None
    context_label: str
    total_by_sentiment: TopicSentiment
    total_filtered: int
    comments: list[PublicationComment]


class CandidateTopicListRow(TopicRankingRow):
    """Linha da lista "Todos os tópicos do candidato"."""

    share_pct: float


class CandidateTopicListResult(ApiModel):
    """GET /candidates/{id}/topics — modal "Todos os tópicos do candidato"."""

    entity: Entity | None = None
    network: Network
    total_topics: int
    total_mentions: int
    rows: list[CandidateTopicListRow]
    total_filtered: int
    remaining_mentions: int


class TopicCalendarDay(ApiModel):
    """Um dia no calendário de tópicos - ver TopicCalendarEntity.

    `top_label`/`mentions` ausentes = dia sem modelo diário carregado (ver
    pipeline/weekly_topics.py em pave-tm) ou sem documentos suficientes naquele dia -
    célula vazia no calendário, não um erro.
    """

    date: Date
    top_label: str | None = None
    mentions: int | None = None


class TopicCalendarEntity(ApiModel):
    entity_id: str
    days: list[TopicCalendarDay]


class TopicCalendarResult(ApiModel):
    """GET /topics/calendar — um mini-calendário por candidato (ver DayFilterCard ->
    calendário no front): o tópico de maior volume de cada dia, candidato a candidato,
    numa janela de dias."""

    entities: list[TopicCalendarEntity]
