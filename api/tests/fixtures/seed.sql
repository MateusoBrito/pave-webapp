
INSERT INTO fonte (codigo, nome, ativa) VALUES
  ('youtube', 'YouTube', true),
  ('reddit',  'Reddit',  true),
  ('meta',    'Meta Ads', true);

INSERT INTO entidade (codigo, nome_exibicao, partido, foto, ativa) VALUES
  ('lula',             'Lula',             NULL, '/fotos/lula.jpg', true),
  ('flavio_bolsonaro', 'Flavio Bolsonaro', NULL, NULL,              true),
  ('pablo_marcal',     'Pablo Marçal',     NULL, NULL,              false),
  ('samara',           'Samara',           NULL, NULL,              true);

INSERT INTO alvo_coleta (id, entidade_codigo, fonte_codigo, canal, termo_busca, tipo, usar_na_busca, ativo) VALUES
  (1, 'lula',             'youtube', 'UCvO2BExvkAbGMsTGnEnI_Ng', '',                 'canal',    true, true),
  (2, 'flavio_bolsonaro', 'youtube', 'UCl2HptoHv6PjZMQAwTdA--Q', '',                 'canal',    true, true),
  (3, 'lula',             'meta',    '267949976607343',          '',                 'handle',   true, true),
  (4, 'flavio_bolsonaro', 'meta',    '156951837773645',          '',                 'handle',   true, true),
  (5, 'lula',             'reddit',  'brasil',                   'Lula',             'consulta', true, true),
  (6, 'lula',             'reddit',  'brasilivre',               'Lula',             'consulta', true, true),
  (7, 'flavio_bolsonaro', 'reddit',  'brasil',                   'Flavio Bolsonaro', 'consulta', true, true),
  (8, 'pablo_marcal',     'reddit',  'brasil',                   'Pablo Marcal',     'consulta', true, false),
  (9, 'samara',           'reddit',  'brasil',                   'Samara',           'consulta', true, true);

INSERT INTO modelo (id, tipo, fonte_codigo, nome, versao, treinado_em, parametros, metricas, status) VALUES
  (1, 'topico', 'reddit',  'reddit_lula__qwen3_0_6b',             'k15', now(),
      '{"entidade_codigo":"lula","k":15,"algoritmo_clustering":"kmeans"}', '{}', 'vigente'),
  (2, 'topico', 'youtube', 'youtube_lula__qwen3_0_6b',            'k15', now(),
      '{"entidade_codigo":"lula","k":15}', '{}', 'vigente'),
  (3, 'topico', 'reddit',  'reddit_flavio_bolsonaro__qwen3_0_6b', 'k15', now(),
      '{"entidade_codigo":"flavio_bolsonaro","k":15}', '{}', 'vigente'),
  (4, 'topico', 'meta',    'meta_lula__qwen3_0_6b',               'k15', now(),
      '{"entidade_codigo":"lula","k":15}', '{}', 'vigente'),
  (5, 'topico', 'reddit',  'reddit_lula__minilm_l12',             'k10', now(),
      '{"entidade_codigo":"lula","k":10}', '{}', 'arquivado'),
  (6, 'sentimento', NULL,  'sent_br',                             'v1',  now(), '{}', '{}', 'vigente');

INSERT INTO topico (id, modelo_id, numero, rotulo, revisado, palavras_chave, tamanho) VALUES
  (10, 1, 0, NULL, false, ARRAY['inflacao','gasolina','preco','cesta'], 400),
  (11, 1, 1, NULL, false, ARRAY['sus','hospital','remedio'],            250),
  (12, 2, 0, 'Educação e ENEM', true, ARRAY['escola','enem'],           180),
  (13, 3, 0, NULL, false, ARRAY['seguranca','policia'],                 150),
  (14, 4, 0, NULL, false, ARRAY['campanha','voto'],                     90),
  (15, 5, 0, NULL, false, ARRAY['arquivado'],                           50),
  (16, 1, -1, 'Sem tópico definido', false, ARRAY[]::text[],            700),
  (17, 1, 7, NULL, false, ARRAY[]::text[],                              10);
