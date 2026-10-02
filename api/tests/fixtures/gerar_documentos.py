"""Gera `documentos.sql` — carga determinística, para as contagens dos testes serem exatas.

Volume por (alvo, tópico) é fixo por dia, não aleatório: um teste que afirma
"lula tem 289 menções" precisa continuar valendo na próxima execução.
"""

import datetime
from pathlib import Path

INICIO = datetime.date(2026, 8, 1)
DIAS = 30

PLANO = [
    (5, 10, "post", 3),
    (6, 10, "post", 2),
    (5, 11, "post", 2),
    (1, 12, "comentario", 4),
    (7, 13, "post", 3),
    (3, 14, "anuncio", 2),
    (2, None, "comentario", 1),
]

def gerar() -> str:
    docs, dt = [], []
    did = 1
    for dia in range(DIAS):
        data = INICIO + datetime.timedelta(days=dia)
        for alvo, topico, tipo, por_dia in PLANO:
            for n in range(por_dia):
                ts = f"{data.isoformat()}T{10 + n:02d}:30:00-03"
                docs.append((did, alvo, tipo, f"texto {did}", ts))
                if topico:
                    dt.append((did, topico))
                did += 1

    docs.append((did, 1, "video", "video oficial do canal", "2026-08-05T10:00:00-03"))
    did += 1
    docs.append((did, 8, "post", "de alvo inativo", "2026-08-06T10:00:00-03"))
    did += 1
    docs.append((did, 5, "post", "publicado tarde da noite", "2026-08-15T23:30:00-03"))
    dt.append((did, 10))
    did += 1
    docs.append((did, 5, "post", "fora da janela (julho)", "2026-07-31T12:00:00-03"))
    dt.append((did, 10))

    linhas = [
        "-- GERADO por gerar_documentos.py -- não editar à mão",
        (
            "INSERT INTO documento (id, alvo_coleta_id, id_nativo, id_mongo, tipo, "
            "texto, publicado_em, coletado_em, metadados) VALUES"
        ),
        ",\n".join(
            f"  ({i}, {a}, 'n{i}', 'm{i}', '{t}', '{x}', '{p}', '{p}', NULL)"
            for i, a, t, x, p in docs
        )
        + ";",
        "INSERT INTO documento_topico (documento_id, topico_id) VALUES",
        ",\n".join(f"  ({d}, {t})" for d, t in dt) + ";",
        "SELECT setval('documento_id_seq', (SELECT max(id) FROM documento));",
        "SELECT setval('alvo_coleta_id_seq', (SELECT max(id) FROM alvo_coleta));",
        "SELECT setval('modelo_id_seq', (SELECT max(id) FROM modelo));",
        "SELECT setval('topico_id_seq', (SELECT max(id) FROM topico));",
    ]
    return "\n".join(linhas) + "\n"


if __name__ == "__main__":
    destino = Path(__file__).parent / "documentos.sql"
    destino.write_text(gerar(), encoding="utf-8")
    print(f"{destino} gerado")
