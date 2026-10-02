"""Base dos modelos de resposta.

Duas regras de serialização, ambas ditadas pelo contrato que o front já usa
(`src/api/client.ts` e `src/types/`):

1. **camelCase na saída.** Os campos são escritos em snake_case do lado Python e
   serializados em camelCase. Atenção a siglas: `to_camel("investment_min_brl")`
   devolve `investmentMinBrl`, e o front espera `investmentMinBRL` — esses campos
   levam `serialization_alias` explícito (ver `AdMetadata` em domain.py).

2. **Campo nulo é campo ausente.** No TS os opcionais são `?:` (`photoUrl?: string`,
   `ad?: AdMetadata`, `emergent?: boolean`), isto é `undefined`, não `null`. Nenhum
   campo deste contrato usa `null` como valor com significado próprio, então o
   serializador abaixo simplesmente omite os `None`.

   Isso vive no modelo, e não em `response_model_exclude_none` por rota, por dois
   motivos: o FastAPI só expõe aquele flag rota a rota (e sempre o passa
   explicitamente, o que impede um default global via subclasse de APIRouter), e um
   serializador de modelo também vale para os modelos aninhados.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, SerializerFunctionWrapHandler, model_serializer
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Serializa em camelCase, omitindo campos nulos. Aceita ambas as grafias na entrada."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        from_attributes=True,
    )

    @model_serializer(mode="wrap")
    def _drop_none(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        return {key: value for key, value in handler(self).items() if value is not None}
