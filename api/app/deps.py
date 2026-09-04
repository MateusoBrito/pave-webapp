"""Parâmetros de consulta compartilhados.

Concentra as regras de filtro que hoje moram em `src/api/client.ts` e que a API tem
que reproduzir exatamente, senão os números mudam de valor ao trocar o mock pelo
backend.
"""

from dataclasses import dataclass
from datetime import date as Date
from datetime import timedelta

from fastapi import Depends, HTTPException, Query, status

from .schemas.domain import ORGANIC_NETWORKS, MetaAdPlatform, Network

MAX_PERIOD_DAYS = 366


@dataclass(frozen=True)
class Period:
    """Intervalo fechado nos dois extremos — `from` e `to` entram no resultado.

    (`from` é palavra reservada em Python, por isso os atributos são `start`/`end`;
    na querystring continuam sendo `from` e `to`, que é o que o front manda.)
    """

    start: Date
    end: Date

    @property
    def days(self) -> int:
        return (self.end - self.start).days + 1

    def previous(self) -> "Period":
        """Período imediatamente anterior, de mesma duração — base de toda variação
        "vs. período anterior" (`previousPeriod` no client.ts)."""
        end = self.start - timedelta(days=1)
        return Period(start=end - timedelta(days=self.days - 1), end=end)


def period_params(
    date_from: Date = Query(alias="from", description="ISO yyyy-mm-dd, inclusive"),
    date_to: Date = Query(alias="to", description="ISO yyyy-mm-dd, inclusive"),
) -> Period:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="`from` não pode ser posterior a `to`.",
        )
    period = Period(start=date_from, end=date_to)
    if period.days > MAX_PERIOD_DAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Período máximo de {MAX_PERIOD_DAYS} dias.",
        )
    return period


def _split_csv(raw: str | None) -> list[str]:
    """O front manda listas como `?candidates=lula,flavio-bolsonaro` (ver
    FiltersContext). Ausente ou vazio = sem restrição."""
    if not raw:
        return []
    return [item for item in (part.strip() for part in raw.split(",")) if item]


def entity_ids(
    candidates: str | None = Query(
        None,
        description="IDs separados por vírgula. Ausente ou vazio = todos os candidatos.",
    ),
) -> list[str]:
    return _split_csv(candidates)


def _parse_enum_csv[T](raw: str | None, enum_cls: type[T], field: str) -> list[T]:
    values: list[T] = []
    for item in _split_csv(raw):
        try:
            values.append(enum_cls(item))
        except ValueError as err:
            allowed = ", ".join(member.value for member in enum_cls)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"`{field}` inválido: {item!r}. Valores aceitos: {allowed}.",
            ) from err
    return values


def networks(
    networks: str | None = Query(
        None,
        description="Redes separadas por vírgula. Ausente ou vazio = todas as redes.",
    ),
) -> list[Network]:
    return _parse_enum_csv(networks, Network, "networks")


def platforms(
    platforms: str | None = Query(
        None,
        description="Plataformas Meta separadas por vírgula. Vazio = Facebook e Instagram.",
    ),
) -> list[MetaAdPlatform]:
    return _parse_enum_csv(platforms, MetaAdPlatform, "platforms")


@dataclass(frozen=True)
class OrganicScope:
    """Resultado de restringir um filtro de rede às orgânicas.

    Meta Ads não entra em sentimento nem em ranking de tópico — é conteúdo pago do
    próprio candidato, não conversa do público.

    O caso que exige cuidado: o usuário filtrou **só** Meta Ads. Não sobra rede
    orgânica nenhuma, mas lista vazia significa "todas" no resto do filtro — então
    devolver `[]` faria a tela mostrar tudo em vez de nada. `empty` marca essa
    situação para o endpoint responder vazio de propósito (mesma ressalva de
    `getTopicRanking` no client.ts).
    """

    networks: list[Network]
    empty: bool


def organic_scope(selected: list[Network] = Depends(networks)) -> OrganicScope:
    if not selected:
        return OrganicScope(networks=list(ORGANIC_NETWORKS), empty=False)
    organic = [n for n in selected if n != Network.META_ADS]
    return OrganicScope(networks=organic, empty=not organic)
