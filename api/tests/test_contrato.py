"""Conformidade com o contrato TypeScript do front.

As interfaces em `src/types/` e `src/api/client.ts` são a especificação: o front tipa
contra elas e um campo faltando ou com nome diferente quebra a tela em silêncio (vira
`undefined` no JS, não erro). Aqui as interfaces são lidas do próprio código TS e
confrontadas com o que a API devolve — sem lista de campos duplicada neste arquivo,
que envelheceria.
"""

import re
from pathlib import Path

import pytest

FRONT = Path(__file__).resolve().parents[2] / "src"

CASOS = [
    ("Entity", "/entities", {}, "lista"),
    ("Topic", "/topics", {}, "lista"),
    ("CollectionStatus", "/collection/status", {}, "objeto"),
    ("EmergentTopic", "/topics/emergent", {}, "lista"),
    ("TopicSeriesPoint", "/series", {"periodo": True}, "lista"),
    ("CandidateVolumePoint", "/series/volume", {"periodo": True}, "lista"),
    ("NetworkMentions", "/series/by-network", {"periodo": True}, "lista"),
    ("ShareOfVoiceEntry", "/series/share-of-voice", {"periodo": True}, "lista"),
    ("OverviewSummary", "/overview/summary", {"periodo": True}, "objeto"),
    ("Highlight", "/overview/highlights", {"periodo": True}, "lista"),
    ("TopicRankingRow", "/topics/ranking", {"periodo": True}, "lista"),
    ("TopicDetail", "/topics/10-lula", {"periodo": True}, "objeto"),
    ("SentimentSeriesPoint", "/topics/10-lula/sentiment-series", {"periodo": True}, "lista"),
    ("SubdivisionMatrix", "/topics/by-subdivision",
     {"periodo": True, "network": "reddit"}, "objeto"),
    ("ComparisonCandidateSummary", "/comparison/lula/summary", {"periodo": True}, "objeto"),
    ("CandidateSentimentPoint", "/comparison/negative-sentiment-series",
     {"periodo": True}, "lista"),
    ("CandidateSentimentSummary", "/candidates/sentiment", {"periodo": True}, "lista"),
    ("CandidateContentSummary", "/candidates/content-summary", {"periodo": True}, "objeto"),
    ("AdTopicRankingRow", "/candidates/content/ranking", {"periodo": True}, "lista"),
    ("AdCandidateBreakdownRow", "/candidates/content/by-candidate", {"periodo": True}, "lista"),
    ("CandidateTopicListResult", "/candidates/lula/topics",
     {"periodo": True, "network": "reddit"}, "objeto"),
    ("TopicDocument", "/networks/reddit/documents", {"periodo": True}, "lista"),
]

OPCIONAIS_SEM_DADO = {
    ("TopicDocument", "ad"),
    ("Topic", "emergent"),
    ("Entity", "photoUrl"),
    ("TopicDetail", "peakDate"),
    ("ComparisonCandidateSummary", "entity"),
    ("CandidateTopicListResult", "entity"),
    ("PublicationCommentsResult", "entity"),
}


def _ler_fonte_ts() -> str:
    partes = [(FRONT / "api" / "client.ts").read_text(encoding="utf-8")]
    for arquivo in sorted((FRONT / "types").glob("*.ts")):
        partes.append(arquivo.read_text(encoding="utf-8"))
    return "\n".join(partes)


def _campos_da_interface(fonte: str, nome: str) -> tuple[set[str], set[str]]:
    """(obrigatórios, opcionais) declarados na interface TS.

    Um parser deliberadamente simples: só precisa dar conta das interfaces planas
    deste projeto. `extends` é seguido uma vez, que é a profundidade usada aqui.
    """
    padrao = rf"export interface {nome}(?:\s+extends\s+(\w+))?\s*\{{(.*?)\n\}}"
    m = re.search(padrao, fonte, re.DOTALL)
    if not m:
        pytest.fail(f"interface {nome} não encontrada no front")

    obrigatorios: set[str] = set()
    opcionais: set[str] = set()
    if m.group(1):
        herdados = _campos_da_interface(fonte, m.group(1))
        obrigatorios |= herdados[0]
        opcionais |= herdados[1]

    corpo = re.sub(r"/\*.*?\*/", "", m.group(2), flags=re.DOTALL)
    corpo = re.sub(r"//.*", "", corpo)
    for linha in corpo.splitlines():
        campo = re.match(r"\s*(\w+)(\??):", linha)
        if campo:
            (opcionais if campo.group(2) else obrigatorios).add(campo.group(1))
    return obrigatorios, opcionais


@pytest.fixture(scope="module")
def fonte_ts() -> str:
    return _ler_fonte_ts()


@pytest.mark.parametrize(("interface", "caminho", "params", "forma"), CASOS)
def test_resposta_tem_os_campos_declarados_no_front(
    client, periodo, fonte_ts, interface, caminho, params, forma
):
    consulta = dict(params)
    if consulta.pop("periodo", False):
        consulta.update(periodo)

    resposta = client.get(caminho, params=consulta)
    assert resposta.status_code == 200, f"{caminho} -> {resposta.status_code}"
    corpo = resposta.json()

    if forma == "lista":
        assert isinstance(corpo, list)
        if not corpo:
            pytest.skip(f"{caminho} devolveu lista vazia — nada a conferir")
        amostra = corpo[0]
    else:
        amostra = corpo

    obrigatorios, opcionais = _campos_da_interface(fonte_ts, interface)
    sem_dado = {c for (i, c) in OPCIONAIS_SEM_DADO if i == interface}

    faltando = obrigatorios - set(amostra) - sem_dado
    assert not faltando, f"{interface}: a API não devolveu {sorted(faltando)}"

    extras = set(amostra) - obrigatorios - opcionais
    assert not extras, f"{interface}: a API devolveu campos que o front não declara: {sorted(extras)}"


def test_campos_opcionais_saem_ausentes_e_nao_nulos(client):
    """No TS `campo?: T` significa `undefined`. Um `null` no JSON é outro valor e
    chega em componentes que esperam `string | undefined` (ver ui/Avatar)."""
    def sem_nulos(valor, caminho="raiz"):
        if isinstance(valor, dict):
            for chave, v in valor.items():
                assert v is not None, f"{caminho}.{chave} veio null"
                sem_nulos(v, f"{caminho}.{chave}")
        elif isinstance(valor, list):
            for i, v in enumerate(valor):
                sem_nulos(v, f"{caminho}[{i}]")

    for caminho in ("/entities", "/topics", "/topics/emergent"):
        sem_nulos(client.get(caminho).json(), caminho)


def test_sigla_brl_preserva_a_caixa(client, periodo):
    """`to_camel("investment_min_brl")` daria `investmentMinBrl`; o front declara
    `investmentMinBRL`."""
    corpo = client.get("/candidates/content-summary", params=periodo).json()
    assert "investmentMinBRL" in corpo
    assert "investmentMaxBRL" in corpo
    assert "investmentMinBrl" not in corpo
