"""Tipos de domínio — espelham `src/types/` do front, campo a campo.

Qualquer mudança aqui é mudança de contrato: o front tipa em cima destes objetos.
"""

from datetime import date as Date
from datetime import datetime
from enum import Enum

from pydantic import Field

from .base import ApiModel


class Network(str, Enum):
    """`src/types/network.ts`."""

    YOUTUBE = "youtube"
    REDDIT = "reddit"
    META_ADS = "meta_ads"


NETWORK_LABELS: dict[Network, str] = {
    Network.YOUTUBE: "YouTube",
    Network.REDDIT: "Reddit",
    Network.META_ADS: "Meta Ads",
}

NETWORK_TO_FONTE: dict[Network, str] = {
    Network.YOUTUBE: "youtube",
    Network.REDDIT: "reddit",
    Network.META_ADS: "meta",
}

FONTE_TO_NETWORK: dict[str, Network] = {v: k for k, v in NETWORK_TO_FONTE.items()}


def fonte_de(network: Network) -> str:
    return NETWORK_TO_FONTE[network]


def network_de(fonte_codigo: str) -> Network | None:
    """`None` para fonte que o painel não conhece — melhor omitir a linha do que
    derrubar a resposta inteira com ValueError."""
    return FONTE_TO_NETWORK.get(fonte_codigo)

ORGANIC_NETWORKS: list[Network] = [Network.YOUTUBE, Network.REDDIT]


class SentimentLabel(str, Enum):
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"


class MetaAdPlatform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"


class TopicSentiment(ApiModel):
    """Contagens, não proporções — soma ao total de menções do que estiver anexado."""

    negative: int = 0
    neutral: int = 0
    positive: int = 0

    @property
    def total(self) -> int:
        return self.negative + self.neutral + self.positive

    @property
    def predominant(self) -> SentimentLabel:
        """Mesmo desempate de `predominantOf` no client.ts: negativo ganha empate,
        depois positivo.

        Sem nenhum documento classificado o desempate cairia em `negativo` e o painel
        anunciaria "Clima do debate: Negativo" com 0% em todas as faixas — uma
        afirmação forte sustentada por zero evidência. Nesse caso devolvemos `neutro`,
        que é o rótulo que não afirma nada; quem precisa distinguir "neutro de
        verdade" de "sem dado" olha `total`, que vem zerado.
        """
        if self.total == 0:
            return SentimentLabel.NEUTRAL
        if self.negative >= self.neutral and self.negative >= self.positive:
            return SentimentLabel.NEGATIVE
        if self.positive >= self.neutral:
            return SentimentLabel.POSITIVE
        return SentimentLabel.NEUTRAL


class Entity(ApiModel):
    """Candidato monitorado. `src/types/entity.ts`."""

    id: str
    name: str
    role: str
    aliases: list[str] = Field(default_factory=list)
    photo_url: str | None = None


class Topic(ApiModel):
    """Tópico do BERTopic, sempre de um candidato só — não existe tópico compartilhado
    entre candidatos (`src/types/topic.ts`)."""

    id: str
    entity_id: str
    label: str
    weight: float
    tags: list[str] = Field(default_factory=list)
    emergent: bool | None = None


class EmergentTopic(ApiModel):
    """Documentos sem afinidade com nenhum tópico vigente — alimentam a próxima
    re-modelagem. Não têm série temporal."""

    id: str
    label: str
    document_count: int


class TopicSeriesPoint(ApiModel):
    """Uma linha da agregação analítica: dia × candidato × rede × tópico."""

    date: Date
    entity_id: str
    network: Network
    topic_id: str
    mentions: int
    sentiment: TopicSentiment


class AdMetadata(ApiModel):
    """Metadados da Ad Library — faixas, não valores exatos. Só quando
    `network == meta_ads`."""

    investment_min_brl: int = Field(serialization_alias="investmentMinBRL")
    investment_max_brl: int = Field(serialization_alias="investmentMaxBRL")
    impressions_min: int
    impressions_max: int
    days_active: int
    platforms: list[MetaAdPlatform]
    headline: str
    domain: str
    cta: str


class TopicDocument(ApiModel):
    """Publicação/comentário exibido nos carrosséis de exemplo.

    `author` já vem anonimizado da camada de coleta — nunca expor identificação real
    (ver Metodologia/LGPD).
    """

    id: str
    topic_id: str
    entity_id: str
    network: Network
    author: str
    text: str
    published_at: datetime
    engagement: int
    sentiment: SentimentLabel
    ad: AdMetadata | None = None


class PublicationComment(ApiModel):
    """Comentário de resposta sob uma publicação. Sem autor, por decisão de privacidade."""

    id: str
    text: str
    sentiment: SentimentLabel
    votes: int
    hours_ago: int


class RegistryCandidate(ApiModel):
    """Entrada do registro de candidatos cadastráveis (modal "Adicionar candidato")."""

    id: str
    name: str
    apelidos: int
    termos: int
    monitorada: bool = True
