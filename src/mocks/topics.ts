import type { EmergentTopic, Topic } from '../types'

/** Tópicos por candidato, alinhados entre redes (Fase 2) — hoje escritos à mão, no
 * pipeline real vêm do BERTopic rodando sobre o corpus de cada candidato. */
export const TOPICS: Topic[] = [
  {
    id: 'lula-economia-inflacao',
    entityId: 'lula',
    label: 'Economia e inflação',
    weight: 0.28,
    tags: ['inflação', 'preço', 'gasolina', 'cesta básica', 'juros', 'salário'],
  },
  {
    id: 'lula-saude-sus',
    entityId: 'lula',
    label: 'Saúde / SUS',
    weight: 0.2,
    tags: ['sus', 'hospital', 'remédio', 'fila de espera'],
  },
  {
    id: 'lula-educacao',
    entityId: 'lula',
    label: 'Educação',
    weight: 0.17,
    tags: ['escola', 'universidade', 'enem'],
  },
  {
    id: 'lula-programas-sociais',
    entityId: 'lula',
    label: 'Programas sociais',
    weight: 0.16,
    tags: ['bolsa família', 'auxílio', 'benefício social'],
  },
  {
    id: 'lula-aprovacao',
    entityId: 'lula',
    label: 'Aprovação do governo',
    weight: 0.14,
    tags: ['pesquisa', 'popularidade', 'avaliação'],
  },
  {
    id: 'lula-corrupcao',
    entityId: 'lula',
    label: 'Corrupção',
    weight: 0.11,
    tags: ['investigação', 'desvio', 'operação'],
  },
  {
    id: 'lula-meio-ambiente',
    entityId: 'lula',
    label: 'Meio ambiente',
    weight: 0.08,
    tags: ['amazônia', 'desmatamento', 'clima'],
  },
  {
    id: 'lula-politica-externa',
    entityId: 'lula',
    label: 'Política externa',
    weight: 0.06,
    tags: ['brics', 'diplomacia', 'relações internacionais'],
  },
  {
    id: 'lula-reforma-administrativa',
    entityId: 'lula',
    label: 'Reforma administrativa',
    weight: 0.04,
    tags: ['funcionalismo', 'servidor público', 'reforma do estado'],
    emergent: true,
  },
  {
    id: 'lula-tarifaco',
    entityId: 'lula',
    label: 'Tarifaço e comércio exterior',
    weight: 0.03,
    tags: ['exportação', 'tarifa', 'comércio exterior'],
    emergent: true,
  },

  {
    id: 'flavio-seguranca-publica',
    entityId: 'flavio-bolsonaro',
    label: 'Segurança pública',
    weight: 0.24,
    tags: ['violência', 'polícia', 'crime organizado'],
  },
  {
    id: 'flavio-anistia-8-jan',
    entityId: 'flavio-bolsonaro',
    label: 'Anistia / 8 de janeiro',
    weight: 0.21,
    tags: ['stf', 'anistia', '8 de janeiro', 'inquérito'],
  },
  {
    id: 'flavio-processos',
    entityId: 'flavio-bolsonaro',
    label: 'Processos e STF',
    weight: 0.2,
    tags: ['stf', 'inquérito', 'investigação'],
  },
  {
    id: 'flavio-articulacao',
    entityId: 'flavio-bolsonaro',
    label: 'Articulação política 2026',
    weight: 0.19,
    tags: ['candidatura', 'aliança', 'palanque'],
  },
  {
    id: 'flavio-agenda-economica',
    entityId: 'flavio-bolsonaro',
    label: 'Agenda econômica liberal',
    weight: 0.16,
    tags: ['privatização', 'liberal', 'estado mínimo'],
  },
  {
    id: 'flavio-reforma-tributaria',
    entityId: 'flavio-bolsonaro',
    label: 'Reforma tributária',
    weight: 0.12,
    tags: ['imposto', 'carga tributária', 'arrecadação'],
  },
  {
    id: 'flavio-armamento',
    entityId: 'flavio-bolsonaro',
    label: 'Armamento e posse de arma',
    weight: 0.09,
    tags: ['arma', 'caça', 'colecionador', 'atirador'],
  },
  {
    id: 'flavio-liberdade-expressao',
    entityId: 'flavio-bolsonaro',
    label: 'Liberdade de expressão',
    weight: 0.07,
    tags: ['censura', 'redes sociais', 'moderação de conteúdo'],
  },
  {
    id: 'flavio-agronegocio',
    entityId: 'flavio-bolsonaro',
    label: 'Relação com o agronegócio',
    weight: 0.05,
    tags: ['agro', 'exportação agrícola', 'produtor rural'],
    emergent: true,
  },
  {
    id: 'flavio-costumes',
    entityId: 'flavio-bolsonaro',
    label: 'Costumes e família',
    weight: 0.03,
    tags: ['valores', 'família', 'educação moral'],
    emergent: true,
  },
]

/** Documentos com baixa afinidade a qualquer tópico do modelo vigente — candidatos a
 * virar tópico próprio na próxima re-modelagem mensal. Não têm série temporal associada. */
export const EMERGENT_TOPICS: EmergentTopic[] = [
  {
    id: 'emergente-reforma-administrativa',
    label: 'Reforma administrativa',
    documentCount: 1204,
  },
  { id: 'emergente-tarifaco', label: 'Tarifaço / comércio exterior', documentCount: 980 },
  { id: 'emergente-crise-hidrica', label: 'Crise hídrica', documentCount: 642 },
  { id: 'emergente-isencao-ir', label: 'Isenção do IR', documentCount: 511 },
]
