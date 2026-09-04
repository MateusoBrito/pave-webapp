"""Leitura do `documento.metadados` (JSONB).

**Este é o único ponto do código que depende do formato do JSONB, e o formato ainda
não foi confirmado contra o dado real.** As chaves abaixo são as que as três APIs de
origem usam nativamente; se o coletor renomeia ou aninha algo, é aqui — e só aqui —
que se ajusta.

Campos que o front precisa e que não têm coluna própria:

| front | origem provável |
|---|---|
| `TopicDocument.author` | `authorDisplayName` (YouTube) / `author` (Reddit) |
| `TopicDocument.engagement` | `likeCount` (YouTube) / `score` (Reddit) |
| `AdMetadata.*` | campos da Ad Library (`spend`, `impressions`, …) |
| pai de um comentário | `parentId` (YouTube) / `parent_id` (Reddit) |
"""

import hashlib
from typing import Any

from sqlalchemy import Integer, cast, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql.elements import ColumnElement

from ..models import Documento

AUTHOR_KEYS = ("authorDisplayName", "author", "author_name", "autor")
ENGAGEMENT_KEYS = ("likeCount", "score", "ups", "engajamento")
PARENT_KEYS = ("parentId", "parent_id", "id_pai")

AD_SPEND_KEY = "spend"
AD_IMPRESSIONS_KEY = "impressions"
AD_BOUND_LOWER = "lower_bound"
AD_BOUND_UPPER = "upper_bound"
AD_PLATFORMS_KEYS = ("publisher_platforms", "platforms")
AD_HEADLINE_KEYS = ("ad_creative_link_title", "headline", "titulo")
AD_DOMAIN_KEYS = ("ad_creative_link_caption", "domain", "dominio")
AD_CTA_KEYS = ("cta", "call_to_action_type")
AD_START_KEYS = ("ad_delivery_start_time", "inicio")
AD_STOP_KEYS = ("ad_delivery_stop_time", "fim")


def first_key(data: dict[str, Any] | None, keys: tuple[str, ...]) -> Any:
    """Primeiro valor não-nulo entre as chaves candidatas."""
    if not data:
        return None
    for key in keys:
        if (value := data.get(key)) is not None:
            return value
    return None


def bound(data: dict[str, Any] | None, key: str, which: str) -> int:
    """Extremo de uma faixa da Ad Library (`{"lower_bound": "500", "upper_bound": "999"}`).

    A Meta devolve os limites como string; o campo superior vem ausente quando o
    anúncio está na última faixa aberta, e nesse caso o inferior serve como piso.
    """
    faixa = (data or {}).get(key) or {}
    if not isinstance(faixa, dict):
        return 0
    valor = faixa.get(which) or faixa.get(AD_BOUND_LOWER)
    try:
        return int(float(valor))
    except (TypeError, ValueError):
        return 0


def pseudonymize(author: str | None, documento_id: int) -> str:
    """Autor sempre anonimizado.

    A Metodologia promete que "autores aparecem sem identificação nas telas e nas
    exportações", então o handle real nunca sai da API — nem para o front, nem para o
    CSV exportado. O pseudônimo é derivado por hash, o que o mantém estável (o mesmo
    autor é o mesmo pseudônimo em publicações diferentes) sem ser reversível.
    """
    semente = author or f"doc-{documento_id}"
    digest = hashlib.sha256(semente.encode("utf-8")).hexdigest()
    return f"user_{int(digest[:8], 16) % 10000:04d}"


def json_text(*keys: str) -> ColumnElement:
    """`COALESCE(metadados->>'k1', metadados->>'k2', …)`."""
    return func.coalesce(*[Documento.metadados[key].astext for key in keys])


def json_int(*keys: str) -> ColumnElement:
    """Mesma ideia, já convertido para inteiro (0 quando ausente ou não numérico)."""
    return func.coalesce(
        *[
            cast(func.nullif(Documento.metadados[key].astext, ""), Integer)
            for key in keys
        ],
        0,
    )


def ad_bound_sql(key: str, which: str) -> ColumnElement:
    """Extremo de faixa da Ad Library como inteiro, direto no SQL — necessário para
    somar investimento e impressões sem carregar todos os anúncios na memória."""
    campo = Documento.metadados[key][which].astext
    return func.coalesce(cast(func.nullif(campo, ""), Integer), 0)


def has_platform(platform: str) -> ColumnElement:
    """Anúncio veiculado numa plataforma.

    Containment JSONB (`@>`) sobre `publisher_platforms`. É o operador que expressa
    exatamente a pergunta ("o array contém este valor?"); casar por regexp no texto do
    JSON depende de os nomes das plataformas nunca serem substring um do outro.

    `coalesce` cobre o anúncio sem a chave: `@>` devolve NULL nesse caso, e NULL num
    `WHERE` descarta a linha silenciosamente — o que aqui até dá o resultado certo,
    mas por acidente.
    """
    return func.coalesce(
        Documento.metadados[AD_PLATFORMS_KEYS[0]].contains(
            cast([platform], JSONB)
        ),
        False,
    )
