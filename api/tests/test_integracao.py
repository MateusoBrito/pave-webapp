"""Endpoints contra um Postgres real, com carga no formato do pave-pipeline.

As contagens esperadas saem de `tests/fixtures/gerar_documentos.py`, que é
determinístico. Volume por dia, ao longo de 30 dias:

    lula/reddit/brasil      -> tópico 10 (inflacao)    3/dia = 90
    lula/reddit/brasilivre  -> tópico 10 (inflacao)    2/dia = 60
    lula/reddit/brasil      -> tópico 11 (sus)         2/dia = 60
    lula/youtube            -> tópico 12 (Educação)    4/dia = 120
    flavio/reddit/brasil    -> tópico 13 (seguranca)   3/dia = 90
    lula/meta               -> tópico 14 (campanha)    2/dia = 60
    flavio/youtube          -> sem tópico              1/dia = 30

  + 1 documento às 23h30 de 15/08 (lula/reddit/brasil, tópico 10)
  + 1 vídeo, 1 de alvo inativo e 1 em julho — nenhum dos três conta em agosto
"""

import pytest

LULA_REDDIT = 90 + 60 + 60 + 1
LULA_YOUTUBE = 120
LULA_META = 60
FLAVIO_REDDIT = 90
FLAVIO_YOUTUBE = 30

TOTAL_LULA = LULA_REDDIT + LULA_YOUTUBE + LULA_META
TOTAL_FLAVIO = FLAVIO_REDDIT + FLAVIO_YOUTUBE
TOTAL = TOTAL_LULA + TOTAL_FLAVIO


def get(client, caminho, **params):
    resposta = client.get(caminho, params=params)
    assert resposta.status_code == 200, f"{caminho} -> {resposta.status_code}: {resposta.text[:200]}"
    return resposta.json()


class TestEntidades:
    def test_lista_so_as_ativas(self, client):
        entidades = get(client, "/entities")
        codigos = {e["id"] for e in entidades}
        assert codigos == {"lula", "flavio_bolsonaro", "samara"}
        assert "pablo_marcal" not in codigos, "entidade inativa não pode entrar"

    def test_codigo_e_slug_com_underscore(self, client):
        assert any(e["id"] == "flavio_bolsonaro" for e in get(client, "/entities"))

    def test_aliases_vem_dos_termos_de_busca(self, client):
        """O seed do pipeline nunca cria `tipo='alias'` — os apelidos reais são os
        `termo_busca` de tipo `consulta`."""
        lula = next(e for e in get(client, "/entities") if e["id"] == "lula")
        assert lula["aliases"] == ["Lula"]

    def test_foto_vem_do_pipeline(self, client):
        lula = next(e for e in get(client, "/entities") if e["id"] == "lula")
        assert lula["photoUrl"] == "/fotos/lula.jpg"

    def test_sem_foto_o_campo_some(self, client):
        """Contrato TS é `photoUrl?: string` — ausente, não `null`."""
        flavio = next(e for e in get(client, "/entities") if e["id"] == "flavio_bolsonaro")
        assert "photoUrl" not in flavio


class TestRegistro:
    def test_inclui_inativas_marcadas(self, client):
        registro = {c["id"]: c for c in get(client, "/registry/candidates")}
        assert registro["pablo_marcal"]["monitorada"] is False
        assert registro["lula"]["monitorada"] is True

    def test_conta_apelidos_e_termos(self, client):
        lula = {c["id"]: c for c in get(client, "/registry/candidates")}["lula"]
        assert lula["apelidos"] == 2, "duas consultas no Reddit (brasil e brasilivre)"
        assert lula["termos"] == 4, "as duas do Reddit + canal do YouTube + página Meta"


class TestTopicos:
    def test_exclui_modelo_arquivado_e_outlier(self, client):
        ids = {t["id"] for t in get(client, "/topics")}
        assert not any(i.startswith("15-") for i in ids), "tópico de modelo arquivado"
        assert not any(i.startswith("16-") for i in ids), "outlier (numero = -1)"

    def test_rotulo_revisado_vence_as_palavras_chave(self, client):
        topico = next(t for t in get(client, "/topics") if t["id"] == "12-lula")
        assert topico["label"] == "Educação e ENEM"

    def test_sem_rotulo_usa_palavras_chave(self, client):
        topico = next(t for t in get(client, "/topics") if t["id"] == "10-lula")
        assert topico["label"] == "inflacao · gasolina · preco"

    def test_emergente_nunca_e_afirmado(self, client):
        assert all("emergent" not in t for t in get(client, "/topics"))

    def test_peso_soma_um_por_entidade(self, client):
        pesos: dict[str, float] = {}
        for t in get(client, "/topics"):
            pesos[t["entityId"]] = pesos.get(t["entityId"], 0) + t["weight"]
        for entidade, soma in pesos.items():
            assert soma == pytest.approx(1.0, abs=0.01), f"{entidade} soma {soma}"

    def test_outlier_aparece_como_emergente(self, client):
        emergentes = get(client, "/topics/emergent")
        assert [e["label"] for e in emergentes] == ["Sem tópico definido"]
        assert emergentes[0]["documentCount"] == 700


class TestFiltroDeCandidato:
    def test_sem_filtro_traz_todos(self, client, periodo):
        assert get(client, "/overview/summary", **periodo)["totalMentions"] == TOTAL

    @pytest.mark.parametrize(
        ("candidato", "esperado"), [("lula", TOTAL_LULA), ("flavio_bolsonaro", TOTAL_FLAVIO)]
    )
    def test_por_candidato(self, client, periodo, candidato, esperado):
        resumo = get(client, "/overview/summary", **periodo, candidates=candidato)
        assert resumo["totalMentions"] == esperado

    def test_particao_e_exata(self, client, periodo):
        """A soma das partes tem que dar o total — nada dobrado, nada perdido."""
        soma = sum(
            get(client, "/overview/summary", **periodo, candidates=c)["totalMentions"]
            for c in ("lula", "flavio_bolsonaro")
        )
        assert soma == TOTAL

    def test_lista_vazia_equivale_a_todos(self, client, periodo):
        assert get(client, "/overview/summary", **periodo, candidates="")[
            "totalMentions"
        ] == TOTAL


class TestFiltroDeRede:
    @pytest.mark.parametrize(
        ("rede", "esperado"),
        [
            ("youtube", LULA_YOUTUBE + FLAVIO_YOUTUBE),
            ("reddit", LULA_REDDIT + FLAVIO_REDDIT),
            ("meta_ads", LULA_META),
        ],
    )
    def test_por_rede(self, client, periodo, rede, esperado):
        assert get(client, "/overview/summary", **periodo, networks=rede)[
            "totalMentions"
        ] == esperado

    def test_meta_ads_casa_com_a_fonte_meta_do_banco(self, client, periodo):
        """O banco grava `meta`; o front pede `meta_ads`. Sem tradução, dá zero."""
        assert get(client, "/overview/summary", **periodo, networks="meta_ads")[
            "totalMentions"
        ] > 0

    def test_particao_por_rede_e_exata(self, client, periodo):
        soma = sum(
            get(client, "/overview/summary", **periodo, networks=r)["totalMentions"]
            for r in ("youtube", "reddit", "meta_ads")
        )
        assert soma == TOTAL

    def test_by_network_devolve_sempre_as_tres(self, client, periodo):
        redes = get(client, "/series/by-network", **periodo)
        assert [r["network"] for r in redes] == ["youtube", "reddit", "meta_ads"]
        assert sum(r["mentions"] for r in redes) == TOTAL

    def test_ranking_ignora_meta_ads(self, client, periodo):
        """Anúncio pago é conteúdo do candidato, não conversa do público."""
        assert get(client, "/topics/ranking", **periodo, networks="meta_ads") == []

    def test_sentimento_por_candidato_vazio_com_so_meta_ads(self, client, periodo):
        assert get(client, "/candidates/sentiment", **periodo, networks="meta_ads") == []


class TestFiltroDePeriodo:
    def test_janela_menor_traz_menos(self, client):
        largo = get(client, "/overview/summary", **{"from": "2026-08-01", "to": "2026-08-30"})
        estreito = get(client, "/overview/summary", **{"from": "2026-08-01", "to": "2026-08-07"})
        assert estreito["totalMentions"] < largo["totalMentions"]

    def test_documento_de_julho_fica_fora_de_agosto(self, client):
        agosto = get(client, "/overview/summary", **{"from": "2026-08-01", "to": "2026-08-30"})
        assert agosto["totalMentions"] == TOTAL

    def test_dia_unico(self, client):
        um = get(client, "/overview/summary", **{"from": "2026-08-10", "to": "2026-08-10"})
        assert um["totalDays"] == 1
        assert um["totalMentions"] == 17, "3+2+2+4+3+2+1 documentos por dia"

    def test_publicacao_da_noite_cai_no_dia_local(self, client):
        """23h30 de 15/08 em Brasília é 02h30 UTC de 16/08 — agrupar por UTC
        deslocaria o pico."""
        serie = get(
            client, "/series/volume", **{"from": "2026-08-15", "to": "2026-08-15"},
            candidates="lula", networks="reddit",
        )
        assert sum(p["mentions"] for p in serie) == 8, "7 do dia + o das 23h30"


class TestValidacao:
    def test_from_depois_de_to(self, client):
        assert client.get(
            "/topics/ranking", params={"from": "2026-09-01", "to": "2026-08-01"}
        ).status_code == 422

    def test_rede_invalida(self, client, periodo):
        r = client.get("/topics/ranking", params={**periodo, "networks": "tiktok"})
        assert r.status_code == 422
        assert "tiktok" in r.json()["detail"]

    def test_periodo_longo_demais(self, client):
        assert client.get(
            "/topics/ranking", params={"from": "2020-01-01", "to": "2026-08-01"}
        ).status_code == 422

    def test_subdivisao_nao_aceita_meta_ads(self, client, periodo):
        assert client.get(
            "/topics/by-subdivision", params={**periodo, "network": "meta_ads"}
        ).status_code == 422

    def test_topico_inexistente(self, client, periodo):
        assert client.get("/topics/999-ninguem", params=periodo).status_code == 404

    def test_id_de_topico_malformado(self, client, periodo):
        assert client.get("/topics/lula-economia", params=periodo).status_code == 404

    def test_candidato_inexistente_no_comparativo(self, client, periodo):
        assert client.get("/comparison/ninguem/summary", params=periodo).status_code == 404
