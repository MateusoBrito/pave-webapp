"""Coerência entre endpoints.

Cada tela do painel cruza números de endpoints diferentes; se eles discordarem, o
usuário vê uma contradição na mesma página. Estes testes fixam as relações que
precisam valer entre eles.
"""

import pytest

PERIODO = {"from": "2026-08-01", "to": "2026-08-30"}


def get(client, caminho, **params):
    r = client.get(caminho, params=params)
    assert r.status_code == 200, f"{caminho} -> {r.status_code}: {r.text[:150]}"
    return r.json()


class TestVolume:
    def test_serie_diaria_soma_o_total_do_resumo(self, client):
        serie = get(client, "/series/volume", **PERIODO)
        resumo = get(client, "/overview/summary", **PERIODO)
        assert sum(p["mentions"] for p in serie) == resumo["totalMentions"]

    def test_por_rede_soma_o_total_do_resumo(self, client):
        redes = get(client, "/series/by-network", **PERIODO)
        resumo = get(client, "/overview/summary", **PERIODO)
        assert sum(r["mentions"] for r in redes) == resumo["totalMentions"]

    def test_divisao_por_candidato_dentro_da_rede_fecha(self, client):
        for rede in get(client, "/series/by-network", **PERIODO):
            assert sum(e["mentions"] for e in rede["byEntity"]) == rede["mentions"], (
                f"barra de {rede['network']} não fecha com sua divisão"
            )

    def test_share_of_voice_soma_um(self, client):
        entradas = get(client, "/series/share-of-voice", **PERIODO)
        assert sum(e["share"] for e in entradas) == pytest.approx(1.0)

    def test_share_of_voice_bate_com_o_total(self, client):
        entradas = get(client, "/series/share-of-voice", **PERIODO)
        resumo = get(client, "/overview/summary", **PERIODO)
        assert sum(e["mentions"] for e in entradas) == resumo["totalMentions"]


class TestRanking:
    def test_ordenado_por_mencoes_decrescente(self, client):
        linhas = get(client, "/topics/ranking", **PERIODO)
        assert [r["mentions"] for r in linhas] == sorted(
            (r["mentions"] for r in linhas), reverse=True
        )

    def test_limit_corta_do_topo(self, client):
        completo = get(client, "/topics/ranking", **PERIODO)
        cortado = get(client, "/topics/ranking", **PERIODO, limit=2)
        assert len(cortado) == 2
        assert [r["topic"]["id"] for r in cortado] == [
            r["topic"]["id"] for r in completo[:2]
        ]

    def test_nenhuma_linha_com_zero_mencoes(self, client):
        assert all(r["mentions"] > 0 for r in get(client, "/topics/ranking", **PERIODO))

    def test_topico_pertence_ao_candidato_do_id_composto(self, client):
        for linha in get(client, "/topics/ranking", **PERIODO):
            id_composto = linha["topic"]["id"]
            assert id_composto.endswith(linha["topic"]["entityId"])

    def test_soma_por_candidato_bate_com_o_resumo_organico(self, client):
        """O ranking exclui Meta Ads; o resumo com escopo orgânico tem que casar."""
        ranking = get(client, "/topics/ranking", **PERIODO)
        organico = get(client, "/overview/summary", **PERIODO, networks="youtube,reddit")
        assert sum(r["mentions"] for r in ranking) <= organico["totalMentions"]


class TestDrilldown:
    def test_detalhe_bate_com_a_linha_do_ranking(self, client):
        linha = get(client, "/topics/ranking", **PERIODO)[0]
        detalhe = get(client, f"/topics/{linha['topic']['id']}", **PERIODO)
        assert detalhe["mentions"] == linha["mentions"]
        assert detalhe["topic"]["label"] == linha["topic"]["label"]
        assert detalhe["dominantNetwork"] == linha["dominantNetwork"]

    def test_serie_do_topico_soma_o_total_do_detalhe(self, client):
        topico = get(client, "/topics/ranking", **PERIODO)[0]["topic"]["id"]
        serie = get(client, f"/topics/{topico}/series-by-candidate", **PERIODO)
        detalhe = get(client, f"/topics/{topico}", **PERIODO)
        assert sum(p["mentions"] for p in serie) == detalhe["mentions"]

    def test_serie_do_topico_e_de_um_candidato_so(self, client):
        topico = get(client, "/topics/ranking", **PERIODO)[0]["topic"]["id"]
        serie = get(client, f"/topics/{topico}/series-by-candidate", **PERIODO)
        assert len({p["entityId"] for p in serie}) == 1

    def test_pico_esta_dentro_do_periodo(self, client):
        detalhe = get(client, "/topics/10-lula", **PERIODO)
        if "peakDate" in detalhe:
            assert PERIODO["from"] <= detalhe["peakDate"] <= PERIODO["to"]

    def test_share_do_topico_entre_zero_e_cem(self, client):
        detalhe = get(client, "/topics/10-lula", **PERIODO)
        assert 0 <= detalhe["sharePct"] <= 100


class TestSubdivisao:
    def test_linha_soma_o_total_do_topico_naquela_rede(self, client):
        matriz = get(client, "/topics/by-subdivision", **PERIODO, network="reddit")
        ranking = {
            r["topic"]["id"]: r["mentions"]
            for r in get(client, "/topics/ranking", **PERIODO, networks="reddit")
        }
        for linha in matriz["rows"]:
            soma = sum(linha["values"].values())
            assert soma == ranking[linha["topic"]["id"]], (
                f"{linha['topic']['id']}: subdivisão soma {soma}, ranking diz "
                f"{ranking[linha['topic']['id']]}"
            )

    def test_chaves_das_colunas_batem_com_os_valores(self, client):
        """O front indexa `row.values[col.key]` — se divergirem, a grade fica vazia."""
        matriz = get(client, "/topics/by-subdivision", **PERIODO, network="reddit")
        chaves = {c["key"] for c in matriz["columns"]}
        for linha in matriz["rows"]:
            assert set(linha["values"]) == chaves

    def test_rotulo_do_reddit_tem_prefixo(self, client):
        matriz = get(client, "/topics/by-subdivision", **PERIODO, network="reddit")
        assert all(c["label"].startswith("r/") for c in matriz["columns"])

    def test_rotulo_do_youtube_nao_expoe_channel_id(self, client):
        matriz = get(client, "/topics/by-subdivision", **PERIODO, network="youtube")
        for coluna in matriz["columns"]:
            assert not coluna["label"].startswith("UC"), "channel_id cru no rótulo"
            assert coluna["label"].startswith("Canal do ")

    def test_max_value_e_o_maior_da_matriz(self, client):
        matriz = get(client, "/topics/by-subdivision", **PERIODO, network="reddit")
        maior = max(v for linha in matriz["rows"] for v in linha["values"].values())
        assert matriz["maxValue"] == maior


class TestComparativo:
    def test_resumo_bate_com_o_ranking_do_candidato(self, client):
        resumo = get(client, "/comparison/lula/summary", **PERIODO, networks="reddit")
        ranking = get(client, "/topics/ranking", **PERIODO, candidates="lula", networks="reddit")
        assert resumo["mentions"] == sum(r["mentions"] for r in ranking)

    def test_top_topics_mais_outros_cobre_tudo(self, client):
        resumo = get(client, "/comparison/lula/summary", **PERIODO, networks="reddit")
        ranking = get(client, "/topics/ranking", **PERIODO, candidates="lula", networks="reddit")
        assert len(resumo["topTopics"]) + resumo["otherTopicsCount"] == len(ranking)
        soma = sum(t["mentions"] for t in resumo["topTopics"]) + resumo["otherTopicsMentions"]
        assert soma == resumo["mentions"]

    def test_percentual_negativo_entre_zero_e_cem(self, client):
        pontos = get(client, "/comparison/negative-sentiment-series", **PERIODO)
        assert all(0 <= p["negativePct"] <= 100 for p in pontos)

    def test_sentimento_por_candidato_inclui_quem_nao_tem_documento(self, client):
        """Sumir da lista faria parecer que o candidato não é monitorado."""
        linhas = get(client, "/candidates/sentiment", **PERIODO, networks="reddit")
        codigos = {linha["entity"]["id"] for linha in linhas}
        assert "samara" in codigos, "entidade ativa sem documentos precisa aparecer zerada"


class TestModalDeTopicos:
    def _lista(self, client, **extra):
        return get(client, "/candidates/lula/topics", **PERIODO, network="reddit", **extra)

    def test_share_soma_cem(self, client):
        dados = self._lista(client)
        assert sum(r["sharePct"] for r in dados["rows"]) == pytest.approx(100.0)

    def test_share_nao_muda_com_a_busca(self, client):
        completo = {r["topic"]["id"]: r["sharePct"] for r in self._lista(client)["rows"]}
        buscado = self._lista(client, search="sus")["rows"]
        for linha in buscado:
            assert linha["sharePct"] == completo[linha["topic"]["id"]]

    def test_total_de_topicos_nao_muda_com_o_filtro(self, client):
        total = self._lista(client)["totalTopics"]
        assert self._lista(client, search="sus")["totalTopics"] == total
        assert self._lista(client, filter="declining")["totalTopics"] == total

    def test_paginacao_reporta_o_que_ficou_de_fora(self, client):
        completo = self._lista(client)
        pagina = self._lista(client, limit=1)
        assert len(pagina["rows"]) == 1
        assert pagina["totalFiltered"] == completo["totalFiltered"]
        assert pagina["remainingMentions"] == sum(
            r["mentions"] for r in completo["rows"][1:]
        )

    def test_busca_casa_rotulo_e_tags(self, client):
        por_tag = self._lista(client, search="hospital")["rows"]
        assert por_tag, "busca por tag deveria achar"
        assert all(
            "hospital" in r["topic"]["label"].lower()
            or any("hospital" in t.lower() for t in r["topic"]["tags"])
            for r in por_tag
        )

    def test_busca_sem_resultado_devolve_lista_vazia(self, client):
        dados = self._lista(client, search="xyzabc")
        assert dados["rows"] == []
        assert dados["totalFiltered"] == 0
        assert dados["totalTopics"] > 0, "o total geral não some"


class TestDocumentos:
    def test_documentos_da_rede_sao_todos_daquela_rede(self, client):
        for rede in ("reddit", "youtube", "meta_ads"):
            docs = get(client, f"/networks/{rede}/documents", **PERIODO)
            assert all(d["network"] == rede for d in docs)

    def test_limite_e_respeitado(self, client):
        docs = get(client, "/networks/reddit/documents", **PERIODO, limit=5)
        assert len(docs) <= 5

    def test_ordenados_do_mais_recente_para_o_mais_antigo(self, client):
        docs = get(client, "/networks/reddit/documents", **PERIODO)
        datas = [d["publishedAt"] for d in docs]
        assert datas == sorted(datas, reverse=True)

    def test_autor_nunca_expoe_identificacao(self, client):
        """A Metodologia promete anonimização nas telas e nas exportações."""
        docs = get(client, "/networks/reddit/documents", **PERIODO)
        assert all(d["author"].startswith("user_") for d in docs)

    def test_documentos_do_topico_sao_do_topico(self, client):
        docs = get(client, "/topics/10-lula/documents")
        assert docs, "o tópico tem documentos"
        assert all(d["topicId"] == "10-lula" for d in docs)

    def test_video_nao_aparece_como_mencao(self, client):
        """Vídeo do canal é conteúdo do candidato, não fala do público."""
        docs = get(client, "/networks/youtube/documents", **PERIODO, limit=200)
        assert all("video oficial" not in d["text"] for d in docs)

    def test_documento_de_alvo_inativo_nao_aparece(self, client):
        for rede in ("reddit", "youtube", "meta_ads"):
            docs = get(client, f"/networks/{rede}/documents", **PERIODO, limit=200)
            assert all("alvo inativo" not in d["text"] for d in docs)


class TestAnuncios:
    def test_contagem_bate_com_a_rede_meta(self, client):
        resumo_ads = get(client, "/candidates/content-summary", **PERIODO)
        por_rede = {r["network"]: r["mentions"] for r in get(client, "/series/by-network", **PERIODO)}
        assert resumo_ads["adsCount"] == por_rede["meta_ads"]

    def test_ativos_nunca_passam_do_total(self, client):
        resumo = get(client, "/candidates/content-summary", **PERIODO)
        assert resumo["activeAdsCount"] <= resumo["adsCount"]

    def test_faixa_minima_nao_passa_da_maxima(self, client):
        resumo = get(client, "/candidates/content-summary", **PERIODO)
        assert resumo["investmentMinBRL"] <= resumo["investmentMaxBRL"]
        assert resumo["impressionsMinTotal"] <= resumo["impressionsMaxTotal"]

    def test_por_candidato_soma_o_total(self, client):
        linhas = get(client, "/candidates/content/by-candidate", **PERIODO)
        resumo = get(client, "/candidates/content-summary", **PERIODO)
        assert sum(linha["adsCount"] for linha in linhas) == resumo["adsCount"]

    def test_ranking_de_anuncios_ordenado_por_investimento(self, client):
        linhas = get(client, "/candidates/content/ranking", **PERIODO)
        chaves = [linha["investmentMinBRL"] + linha["investmentMaxBRL"] for linha in linhas]
        assert chaves == sorted(chaves, reverse=True)
