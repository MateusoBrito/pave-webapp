import type { EmergentTopic, Topic } from '../types'

/** Tópicos globais alinhados entre redes (Fase 2) — hoje escritos à mão, no pipeline
 * real virão do BERTopic rodando sobre o corpus inteiro (todos os candidatos). */
export const TOPICS: Topic[] = [
  {
    id: 'economia-inflacao',
    label: 'Economia e inflação',
    weight: 0.16,
    tags: ['inflação', 'preço', 'gasolina', 'cesta básica', 'juros', 'salário'],
  },
  {
    id: 'seguranca-publica',
    label: 'Segurança pública',
    weight: 0.13,
    tags: ['violência', 'polícia', 'crime organizado'],
  },
  {
    id: 'saude-sus',
    label: 'Saúde / SUS',
    weight: 0.1,
    tags: ['sus', 'hospital', 'remédio', 'fila de espera'],
  },
  {
    id: 'anistia-8-jan',
    label: 'Anistia / 8 de janeiro',
    weight: 0.09,
    tags: ['stf', 'anistia', '8 de janeiro', 'inquérito'],
  },
  {
    id: 'educacao',
    label: 'Educação',
    weight: 0.07,
    tags: ['escola', 'universidade', 'enem'],
  },
  {
    id: 'corrupcao',
    label: 'Corrupção',
    weight: 0.06,
    tags: ['desvio', 'investigação', 'operação'],
  },
  {
    id: 'meio-ambiente',
    label: 'Meio ambiente',
    weight: 0.05,
    tags: ['desmatamento', 'clima', 'sustentabilidade'],
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
