"""Mapeamento das tabelas do Postgres.

Nomes de tabela e coluna são idênticos aos do schema em produção — só a declaração
foi migrada para o estilo 2.0 (`DeclarativeBase` em vez de `declarative_base()`, que
saiu de `sqlalchemy.ext.declarative` e hoje emite deprecation warning).
"""

import enum

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class TipoDocumentoEnum(str, enum.Enum):
    video = "video"
    post = "post"
    comentario = "comentario"
    resposta = "resposta"
    anuncio = "anuncio"


class TipoTermoEnum(str, enum.Enum):
    alias = "alias"
    handle = "handle"
    hashtag = "hashtag"
    consulta = "consulta"
    canal = "canal"


class TipoModeloEnum(str, enum.Enum):
    topico = "topico"
    sentimento = "sentimento"


class StatusModeloEnum(str, enum.Enum):
    treinando = "treinando"
    vigente = "vigente"
    arquivado = "arquivado"


class StatusExecucaoEnum(str, enum.Enum):
    em_execucao = "em_execucao"
    sucesso = "sucesso"
    parcial = "parcial"
    falha = "falha"


class PolaridadeEnum(str, enum.Enum):
    negativo = "negativo"
    neutro = "neutro"
    positivo = "positivo"


class Fonte(Base):
    __tablename__ = "fonte"

    codigo = Column(String(20), primary_key=True)
    nome = Column(String(60), nullable=False)
    ativa = Column(Boolean, nullable=False, default=True)


class Entidade(Base):
    __tablename__ = "entidade"

    codigo = Column(String(40), primary_key=True)
    nome_exibicao = Column(String(80), nullable=False)
    partido = Column(String(40))
    foto = Column(String(255))
    ativa = Column(Boolean, nullable=False, default=True)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AlvoColeta(Base):
    """Alvo de coleta: onde buscar (`canal`) e o que buscar (`termo_busca`).

    É a única ponte entre um documento e a entidade/fonte a que ele pertence — toda
    agregação do painel passa por aqui.
    """

    __tablename__ = "alvo_coleta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entidade_codigo = Column(
        String(40), ForeignKey("entidade.codigo", ondelete="CASCADE"), nullable=False
    )
    fonte_codigo = Column(String(20), ForeignKey("fonte.codigo"), nullable=False)
    canal = Column(String(160), nullable=False)
    termo_busca = Column(String(160), nullable=False, default="")

    tipo = Column(SQLEnum(TipoTermoEnum, name="tipo_termo"), nullable=False)
    usar_na_busca = Column(Boolean, nullable=False, default=True)
    ativo = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index(
            "idx_alvo_coleta_unico",
            entidade_codigo,
            fonte_codigo,
            canal,
            termo_busca,
            unique=True,
        ),
    )


class AlvoColetaEstado(Base):
    __tablename__ = "alvo_coleta_estado"

    alvo_coleta_id = Column(
        Integer, ForeignKey("alvo_coleta.id", ondelete="CASCADE"), primary_key=True
    )
    tipo_documento = Column(
        SQLEnum(TipoDocumentoEnum, name="tipo_documento"), primary_key=True
    )

    total_documentos = Column(Integer, nullable=False, default=0)

    primeiro_publicado_em = Column(DateTime(timezone=True))
    ultimo_publicado_em = Column(DateTime(timezone=True))
    atualizado_em = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Documento(Base):
    __tablename__ = "documento"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    alvo_coleta_id = Column(Integer, ForeignKey("alvo_coleta.id"), nullable=False)
    id_nativo = Column(String(200), nullable=False)
    id_mongo = Column(String(48), nullable=False)
    tipo = Column(SQLEnum(TipoDocumentoEnum, name="tipo_documento"), nullable=False)
    url = Column(Text)
    texto = Column(Text)
    publicado_em = Column(DateTime(timezone=True), nullable=False)
    coletado_em = Column(DateTime(timezone=True), nullable=False)
    metadados = Column(JSONB)

    __table_args__ = (
        Index("idx_documento_alvo_nativo", alvo_coleta_id, id_nativo, unique=True),
        Index("idx_documento_alvo_publicado", alvo_coleta_id, publicado_em),
        Index("idx_documento_publicado", publicado_em),
    )


class Modelo(Base):
    __tablename__ = "modelo"

    id = Column(SmallInteger, primary_key=True, autoincrement=True)
    tipo = Column(SQLEnum(TipoModeloEnum, name="tipo_modelo"), nullable=False)
    fonte_codigo = Column(String(20), ForeignKey("fonte.codigo"))
    nome = Column(String(80), nullable=False)
    versao = Column(String(20), nullable=False)
    janela_inicio = Column(Date)
    janela_fim = Column(Date)
    treinado_em = Column(DateTime(timezone=True))
    parametros = Column(JSONB)
    metricas = Column(JSONB)
    status = Column(
        SQLEnum(StatusModeloEnum, name="status_modelo"),
        nullable=False,
        default=StatusModeloEnum.treinando,
    )

    __table_args__ = (Index("idx_modelo_tipo_nome_versao", tipo, nome, versao, unique=True),)


class Topico(Base):
    __tablename__ = "topico"

    id = Column(Integer, primary_key=True, autoincrement=True)
    modelo_id = Column(
        SmallInteger, ForeignKey("modelo.id", ondelete="CASCADE"), nullable=False
    )
    numero = Column(Integer, nullable=False)
    rotulo = Column(String(140))
    revisado = Column(Boolean, nullable=False, default=False)
    palavras_chave = Column(ARRAY(Text))
    tamanho = Column(Integer)

    __table_args__ = (Index("idx_topico_modelo_numero", modelo_id, numero, unique=True),)


class Sentimento(Base):
    __tablename__ = "sentimento"

    documento_id = Column(
        BigInteger, ForeignKey("documento.id", ondelete="CASCADE"), primary_key=True
    )
    modelo_id = Column(
        SmallInteger, ForeignKey("modelo.id", ondelete="CASCADE"), primary_key=True
    )
    polaridade = Column(SQLEnum(PolaridadeEnum, name="polaridade_enum"), nullable=False)


class DocumentoTopico(Base):
    __tablename__ = "documento_topico"

    documento_id = Column(
        BigInteger, ForeignKey("documento.id", ondelete="CASCADE"), primary_key=True
    )
    topico_id = Column(
        Integer, ForeignKey("topico.id", ondelete="CASCADE"), primary_key=True
    )

    __table_args__ = (Index("idx_doc_topico_topico", topico_id),)
