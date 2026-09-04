"""Regras que não dependem do banco.

Cada caso aqui corresponde a uma regra que, se mudar, muda um número na tela.
"""

from datetime import UTC, date, datetime

import pytest

from app.deps import Period, entity_ids, networks, organic_scope, platforms
from app.queries.base import (
    canal_label,
    compose_topic_id,
    day_bounds,
    parse_topic_id,
    topic_emergent,
    topic_label,
)
from app.queries.comparison import _chave_alfabetica
from app.queries.documents import _build_ad, _parse_dt
from app.queries.metadata import bound, pseudonymize
from app.schemas.domain import (
    MetaAdPlatform,
    Network,
    SentimentLabel,
    TopicSentiment,
    fonte_de,
    network_de,
)


class TestPeriodo:
    def test_duracao_inclui_os_dois_extremos(self):
        assert Period(date(2026, 8, 1), date(2026, 8, 30)).days == 30
        assert Period(date(2026, 8, 1), date(2026, 8, 1)).days == 1

    def test_periodo_anterior_tem_mesma_duracao_e_encosta_no_inicio(self):
        """Base de toda variação "vs. período anterior" (previousPeriod no client.ts)."""
        anterior = Period(date(2026, 8, 1), date(2026, 8, 30)).previous()
        assert anterior == Period(date(2026, 7, 2), date(2026, 7, 31))
        assert anterior.days == 30

    def test_periodo_anterior_de_um_dia(self):
        assert Period(date(2026, 8, 1), date(2026, 8, 1)).previous() == Period(
            date(2026, 7, 31), date(2026, 7, 31)
        )

    def test_limites_sao_instantes_locais_com_fim_exclusivo(self):
        inicio, fim = day_bounds(date(2026, 8, 1), date(2026, 8, 30))
        assert inicio.isoformat() == "2026-08-01T00:00:00-03:00"
        assert fim.isoformat() == "2026-08-31T00:00:00-03:00"


class TestContratoDeFiltro:
    """Lista vazia significa "todos", nunca "nenhum"."""

    @pytest.mark.parametrize("entrada", [None, "", "   "])
    def test_ausente_ou_vazio_nao_filtra(self, entrada):
        assert entity_ids(entrada) == []

    def test_csv_vira_lista_ignorando_espacos_e_vazios(self):
        assert entity_ids(" lula , , flavio_bolsonaro ") == ["lula", "flavio_bolsonaro"]

    def test_rede_invalida_recusa_com_422(self):
        with pytest.raises(Exception) as erro:
            networks("tiktok")
        assert "422" in str(erro.value) or "tiktok" in str(erro.value)

    def test_plataforma_valida(self):
        assert platforms("facebook,instagram") == [
            MetaAdPlatform.FACEBOOK,
            MetaAdPlatform.INSTAGRAM,
        ]


class TestEscopoOrganico:
    """Meta Ads fica fora de sentimento e de ranking de tópico."""

    def test_sem_filtro_usa_as_organicas(self):
        escopo = organic_scope([])
        assert escopo.networks == [Network.YOUTUBE, Network.REDDIT]
        assert escopo.empty is False

    def test_meta_ads_e_removido_da_selecao(self):
        assert organic_scope([Network.REDDIT, Network.META_ADS]).networks == [Network.REDDIT]

    def test_so_meta_ads_marca_vazio_e_nao_vira_todas(self):
        """O caso que mais fácil se erra: sem `empty`, a lista vazia significaria
        "todas as redes" e a tela mostraria o oposto do que o usuário pediu."""
        escopo = organic_scope([Network.META_ADS])
        assert escopo.networks == []
        assert escopo.empty is True


class TestVocabularioDeRede:
    """O front fala `meta_ads`; o banco grava `meta`."""

    def test_traducao_nos_dois_sentidos(self):
        assert fonte_de(Network.META_ADS) == "meta"
        assert network_de("meta") is Network.META_ADS

    @pytest.mark.parametrize("rede", list(Network))
    def test_ida_e_volta_para_toda_rede(self, rede):
        assert network_de(fonte_de(rede)) is rede

    def test_fonte_desconhecida_devolve_none_em_vez_de_estourar(self):
        assert network_de("tiktok") is None


class TestIdCompostoDeTopico:
    def test_ida_e_volta_com_underscore_no_codigo_da_entidade(self):
        composto = compose_topic_id(13, "flavio_bolsonaro")
        assert composto == "13-flavio_bolsonaro"
        assert parse_topic_id(composto) == (13, "flavio_bolsonaro")

    @pytest.mark.parametrize("invalido", ["", "lula-economia", "13-", "-lula", "abc-lula"])
    def test_formato_invalido_devolve_none(self, invalido):
        assert parse_topic_id(invalido) is None


class TestRotuloDeTopico:
    def test_rotulo_revisado_vence(self):
        assert topic_label("Educação", 7, ["escola"]) == "Educação"

    def test_sem_rotulo_usa_as_palavras_chave(self):
        """`load_topicos.py` nunca grava `rotulo`; "Tópico 7" é o que a Metodologia
        descarta explicitamente."""
        assert topic_label(None, 7, ["inflacao", "gasolina", "preco", "cesta"]) == (
            "inflacao · gasolina · preco"
        )

    def test_sem_nada_cai_no_numero(self):
        assert topic_label(None, 7, []) == "Tópico 7"

    def test_emergente_nao_e_afirmado_sem_sinal(self):
        """`revisado` fica sempre false no banco — usá-lo marcaria todo tópico."""
        assert topic_emergent(False) is None
        assert topic_emergent(True) is None


class TestRotuloDeCanal:
    def test_reddit_ganha_o_prefixo(self):
        assert canal_label("reddit", "brasil", "Lula") == "r/brasil"

    def test_reddit_nao_duplica_prefixo(self):
        assert canal_label("reddit", "r/brasil", "Lula") == "r/brasil"

    def test_youtube_troca_o_channel_id_pelo_candidato(self):
        assert canal_label("youtube", "UCvO2BExvkAbGMsTGnEnI_Ng", "Lula") == "Canal do Lula"

    def test_meta_troca_o_page_id_pelo_candidato(self):
        assert canal_label("meta", "267949976607343", "Lula") == "Página de Lula"

    def test_sem_nome_da_entidade_devolve_o_valor_cru(self):
        assert canal_label("youtube", "UCxyz", None) == "UCxyz"


class TestSentimento:
    def test_soma_e_predominante(self):
        s = TopicSentiment(negative=9, neutral=1, positive=1)
        assert s.total == 11
        assert s.predominant is SentimentLabel.NEGATIVE

    def test_empate_favorece_negativo(self):
        assert TopicSentiment(negative=5, neutral=5, positive=5).predominant is (
            SentimentLabel.NEGATIVE
        )

    def test_sem_nenhum_documento_classificado_nao_afirma_negativo(self):
        """A tabela `sentimento` está vazia no banco real. Sem esta ressalva o painel
        anunciaria "Clima do debate: Negativo" com 0% em todas as faixas."""
        vazio = TopicSentiment()
        assert vazio.total == 0
        assert vazio.predominant is SentimentLabel.NEUTRAL


class TestOrdemAlfabetica:
    def test_acentos_nao_vao_para_o_fim(self):
        """`casefold()` sozinho ordena por code point e joga "Á"/"É" depois de "Z"."""
        rotulos = ["Água e saneamento", "Zona rural", "Economia", "Ética", "Saúde"]
        assert sorted(rotulos, key=_chave_alfabetica) == [
            "Água e saneamento",
            "Economia",
            "Ética",
            "Saúde",
            "Zona rural",
        ]


class TestAnuncios:
    @pytest.mark.parametrize(
        "entrada",
        ["2026-08-05", "2026-08-05T10:00:00", "2026-08-05T10:00:00+00:00", "2026-08-05T10:00:00Z"],
    )
    def test_datas_sempre_voltam_com_fuso(self, entrada):
        """A Ad Library mistura formatos; sem normalizar, comparar com `publicado_em`
        (timestamptz) levanta TypeError e derruba a listagem."""
        assert _parse_dt(entrada).tzinfo is not None

    def test_data_invalida_vira_none(self):
        assert _parse_dt("lixo") is None
        assert _parse_dt(None) is None

    def test_faixa_da_ad_library(self):
        dados = {"spend": {"lower_bound": "500", "upper_bound": "999"}}
        assert bound(dados, "spend", "lower_bound") == 500
        assert bound(dados, "spend", "upper_bound") == 999

    def test_faixa_aberta_cai_no_piso(self):
        assert bound({"spend": {"lower_bound": "1000"}}, "spend", "upper_bound") == 1000

    def test_faixa_ausente_vira_zero(self):
        assert bound({}, "spend", "upper_bound") == 0

    def test_metadados_nulos_nao_viram_anuncio(self):
        """`documento.metadados` é NULL no banco real."""
        assert _build_ad(None, datetime.now(UTC)) is None
        assert _build_ad({}, datetime.now(UTC)) is None


class TestAnonimizacao:
    def test_pseudonimo_e_estavel_para_o_mesmo_autor(self):
        assert pseudonymize("joao_silva", 1) == pseudonymize("joao_silva", 999)

    def test_pseudonimo_nao_expoe_o_autor(self):
        assert "joao_silva" not in pseudonymize("joao_silva", 1)

    def test_sem_autor_usa_o_id_do_documento(self):
        assert pseudonymize(None, 42).startswith("user_")
