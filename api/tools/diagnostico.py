"""Diz, tela por tela, o que o banco atual consegue alimentar.

Somente leitura. Não substitui os testes: eles provam que a API está correta, este
script diz se os *dados* existem para o painel ter o que mostrar.

    PAVE_DATABASE_URL="postgresql+asyncpg://usuario:senha@host:5432/panorama_db" \
      .venv/bin/python tools/diagnostico.py
"""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

VERDE, VERMELHO, AMARELO, FIM = "\033[32m", "\033[31m", "\033[33m", "\033[0m"

CONSULTAS = {
    "fontes": "SELECT count(*) FROM fonte",
    "fontes_codigos": "SELECT string_agg(codigo, ', ' ORDER BY codigo) FROM fonte",
    "entidades_ativas": "SELECT count(*) FROM entidade WHERE ativa",
    "entidades_com_foto": "SELECT count(*) FROM entidade WHERE foto IS NOT NULL",
    "entidades_com_partido": "SELECT count(*) FROM entidade WHERE partido IS NOT NULL",
    "alvos_ativos": "SELECT count(*) FROM alvo_coleta WHERE ativo",
    "alvos_consulta": "SELECT count(*) FROM alvo_coleta WHERE tipo = 'consulta' AND ativo",
    "documentos": "SELECT count(*) FROM documento",
    "documentos_recentes": (
        "SELECT count(*) FROM documento WHERE publicado_em >= now() - interval '30 days'"
    ),
    "anuncios": "SELECT count(*) FROM documento WHERE tipo = 'anuncio'",
    "com_metadados": "SELECT count(*) FROM documento WHERE metadados IS NOT NULL",
    "modelos_topico_vigentes": (
        "SELECT count(*) FROM modelo WHERE tipo = 'topico' AND status = 'vigente'"
    ),
    "modelos_sentimento_vigentes": (
        "SELECT count(*) FROM modelo WHERE tipo = 'sentimento' AND status = 'vigente'"
    ),
    "topicos_vigentes": (
        "SELECT count(*) FROM topico t JOIN modelo m ON m.id = t.modelo_id "
        "WHERE m.status = 'vigente' AND t.numero <> -1"
    ),
    "topicos_com_rotulo": (
        "SELECT count(*) FROM topico t JOIN modelo m ON m.id = t.modelo_id "
        "WHERE m.status = 'vigente' AND t.rotulo IS NOT NULL"
    ),
    "atribuicoes_topico": "SELECT count(*) FROM documento_topico",
    "sentimentos": "SELECT count(*) FROM sentimento",
    "ultima_coleta": "SELECT max(ultimo_publicado_em)::date::text FROM alvo_coleta_estado",
}

TELAS = [
    ("Visão Geral — KPIs e volume", [
        ("documentos no último mês", "documentos_recentes", 1),
        ("entidades ativas", "entidades_ativas", 1),
    ]),
    ("Visão Geral — clima do debate", [
        ("classificações de sentimento", "sentimentos", 1),
    ]),
    ("Visão Geral — tabela de tópicos", [
        ("modelos de tópico vigentes", "modelos_topico_vigentes", 1),
        ("tópicos", "topicos_vigentes", 1),
        ("documentos atribuídos a tópico", "atribuicoes_topico", 1),
    ]),
    ("O que os usuários comentam? (Tópicos)", [
        ("tópicos", "topicos_vigentes", 1),
        ("documentos atribuídos a tópico", "atribuicoes_topico", 1),
    ]),
    ("Drill-down de tópico", [
        ("tópicos", "topicos_vigentes", 1),
        ("sentimento (donut e série)", "sentimentos", 1),
    ]),
    ("Comparativo", [
        ("entidades ativas", "entidades_ativas", 2),
        ("tópicos", "topicos_vigentes", 1),
    ]),
    ("O que os candidatos postam? (Meta Ads)", [
        ("anúncios coletados", "anuncios", 1),
        ("metadados de anúncio (investimento/impressões)", "com_metadados", 1),
    ]),
    ("Painel de comentários", [
        ("metadados (vínculo com a publicação-pai)", "com_metadados", 1),
    ]),
    ("Avatares dos candidatos", [
        ("entidades com foto", "entidades_com_foto", 1),
    ]),
]


async def main() -> int:
    from app.config import Settings, get_settings

    settings = get_settings()
    if settings.database_url == Settings.model_fields["database_url"].default:
        print("PAVE_DATABASE_URL não configurada — defina no ambiente ou em api/.env.")
        return 2
    connect_args: dict[str, object] = {}
    if settings.db_ssl == "disable":
        connect_args["ssl"] = False
    elif settings.db_ssl:
        connect_args["ssl"] = settings.db_ssl

    engine = create_async_engine(
        settings.database_url, pool_size=1, max_overflow=0, connect_args=connect_args
    )
    valores: dict[str, object] = {}
    try:
        async with engine.connect() as conn:
            for chave, sql in CONSULTAS.items():
                try:
                    valores[chave] = (await conn.execute(text(sql))).scalar()
                except Exception as err:  # noqa: BLE001
                    valores[chave] = f"erro: {type(err).__name__}"
    except Exception as err:  # noqa: BLE001
        print(f"{VERMELHO}Não consegui conectar:{FIM} {type(err).__name__}: {err}")
        return 2
    finally:
        await engine.dispose()

    print("=" * 66)
    print("ESTADO DO BANCO")
    print("=" * 66)
    for chave, valor in valores.items():
        rotulo = chave.replace("_", " ")
        formatado = f"{valor:,}" if isinstance(valor, int) else valor
        print(f"  {rotulo:38} {formatado}")

    print()
    print("=" * 66)
    print("O QUE CADA TELA CONSEGUE MOSTRAR")
    print("=" * 66)
    bloqueadas = 0
    for tela, requisitos in TELAS:
        faltando = [
            desc
            for desc, chave, minimo in requisitos
            if not isinstance(valores.get(chave), int) or valores[chave] < minimo
        ]
        if faltando:
            bloqueadas += 1
            print(f"  {VERMELHO}vazia{FIM}  {tela}")
            for item in faltando:
                print(f"           falta: {item}")
        else:
            print(f"  {VERDE}ok{FIM}     {tela}")

    print()
    codigos = valores.get("fontes_codigos") or ""
    if isinstance(codigos, str) and "meta_ads" in codigos:
        print(f"{AMARELO}Atenção:{FIM} há uma fonte 'meta_ads' — a API espera 'meta' "
              "(ver NETWORK_TO_FONTE).")
    if valores.get("ultima_coleta") is None:
        print(f"{AMARELO}Atenção:{FIM} alvo_coleta_estado está vazia — o chip de "
              "última coleta fica sem data. A trigger que a preenche vem da migração "
              "0bb2ee4a2c8e do pave-pipeline.")
    if valores.get("topicos_com_rotulo") == 0 and valores.get("topicos_vigentes", 0):
        print(f"{AMARELO}Nota:{FIM} nenhum tópico tem rótulo revisado — a API mostra as "
              "palavras-chave no lugar.")

    print(f"\n{bloqueadas} de {len(TELAS)} telas ficariam vazias com os dados atuais.")
    return 1 if bloqueadas else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
