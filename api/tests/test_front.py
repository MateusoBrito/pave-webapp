"""As URLs que o front monta têm que ser aceitas pela API.

Um contrato de campos conferido (test_contrato.py) não cobre o outro lado: o nome dos
parâmetros de consulta, o formato da lista separada por vírgula, o `encodeURIComponent`
no id composto do tópico. Aqui o `client.ts` de verdade é empacotado e o `fetch`
interceptado — as URLs saem dele, não de uma cópia neste arquivo.
"""

import shutil
import subprocess
from pathlib import Path

import pytest

RAIZ_FRONT = Path(__file__).resolve().parents[2]
EXTRATOR = Path(__file__).parent / "frontcheck" / "urls.mjs"


@pytest.fixture(scope="module")
def urls_do_front() -> list[str]:
    if shutil.which("node") is None:
        pytest.skip("node não disponível")
    if not (RAIZ_FRONT / "node_modules" / "rolldown").is_dir():
        pytest.skip("dependências do front ausentes — rode `npm install` na raiz")

    resultado = subprocess.run(
        ["node", str(EXTRATOR)], capture_output=True, text=True, timeout=180, check=False
    )
    if resultado.returncode != 0:
        pytest.skip(f"não consegui empacotar o client.ts: {resultado.stderr[-300:]}")

    urls = [linha for linha in resultado.stdout.splitlines() if linha.startswith("/")]
    assert urls, "o extrator não capturou nenhuma chamada"
    return urls


def test_extrator_cobre_o_client_inteiro(urls_do_front):
    """Se alguém adicionar uma função em client.ts sem cobri-la aqui, o teste avisa."""
    fonte = (RAIZ_FRONT / "src" / "api" / "client.ts").read_text(encoding="utf-8")
    exportadas = {
        linha.split("function ")[1].split("(")[0]
        for linha in fonte.splitlines()
        if linha.startswith(("export function get", "export async function get"))
    }
    cobertas = len(urls_do_front)
    assert cobertas >= len(exportadas), (
        f"client.ts exporta {len(exportadas)} funções de leitura, "
        f"mas o extrator só produziu {cobertas} chamadas"
    )


def test_toda_url_do_front_responde_200(client, urls_do_front):
    falhas = []
    for url in urls_do_front:
        resposta = client.get(url)
        if resposta.status_code != 200:
            falhas.append(f"{resposta.status_code} {url}")
    assert not falhas, "URLs recusadas pela API:\n  " + "\n  ".join(falhas)


def test_listas_vao_separadas_por_virgula(urls_do_front):
    """O front serializa com `join(',')`; a API separa por vírgula."""
    com_redes = [u for u in urls_do_front if "networks=" in u]
    assert com_redes, "nenhuma chamada com filtro de rede"
    assert any("%2C" in u or "," in u for u in com_redes)


def test_filtro_vazio_nao_vira_parametro(urls_do_front):
    """Lista vazia significa "todos" — mandar `?candidates=` seria outro significado."""
    assert not any("candidates=&" in u or u.endswith("candidates=") for u in urls_do_front)
    assert not any("networks=&" in u or u.endswith("networks=") for u in urls_do_front)
