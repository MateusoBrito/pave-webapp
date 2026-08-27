import type { SentimentLabel } from '../types'

/**
 * Cor de identidade por candidato — fixa por id, nunca posicional. Roxo é
 * reservado para chrome de UI ("Estilo visual · PAVE": "Roxo · só interface")
 * e por isso nunca aparece aqui.
 */
const CANDIDATE_COLORS: Record<string, string> = {
  lula: 'var(--color-lula)',
  'flavio-bolsonaro': 'var(--color-flavio)',
}

/** Reserva categórica p/ candidatos futuros (Fase 6) além dos 2 com cor própria —
 * hash estável por id, não por ordem de chegada. */
const CANDIDATE_FALLBACK_COLORS = [
  'var(--color-blue)',
  'var(--color-pink)',
  'var(--color-orange)',
  'var(--color-green)',
] as const

export function candidateColor(entityId: string): string {
  const known = CANDIDATE_COLORS[entityId]
  if (known) return known
  let hash = 0
  for (let i = 0; i < entityId.length; i++)
    hash = (hash * 31 + entityId.charCodeAt(i)) | 0
  return CANDIDATE_FALLBACK_COLORS[Math.abs(hash) % CANDIDATE_FALLBACK_COLORS.length]
}

/** Sentimento é status, não identidade — negativo/positivo usam as cores de
 * alerta/sucesso da paleta; neutro fica num cinza que recede entre os dois. */
const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  negative: 'var(--color-coral)',
  neutral: 'var(--text-muted)',
  positive: 'var(--color-green)',
}

export function sentimentColor(label: SentimentLabel): string {
  return SENTIMENT_COLORS[label]
}

/** Categórico de tópicos — ordem fixa, nunca reciclada. Evita roxo/teal/âmbar/coral
 * (já reservados para UI, candidatos e sentimento negativo). O 5º slot ("Outros")
 * usa grafite como o fold neutro de baixo contraste cromático. */
const TOPIC_COLORS = [
  'var(--color-blue)',
  'var(--color-pink)',
  'var(--color-orange)',
  'var(--color-green)',
  'var(--color-graphite)',
] as const

export function topicColor(index: number): string {
  return TOPIC_COLORS[index % TOPIC_COLORS.length]
}

/** Cores de rede social — usa a identidade de marca de cada uma (aproximada pela
 * paleta PAVE): YouTube tende a vermelho, Reddit a laranja, Meta a azul. */
const NETWORK_COLORS: Record<string, string> = {
  youtube: 'var(--color-coral)',
  reddit: 'var(--color-orange)',
  meta_ads: 'var(--color-blue)',
}

const NETWORK_TINTS: Record<string, string> = {
  youtube: 'var(--tint-coral)',
  reddit: 'var(--tint-amber)',
  meta_ads: 'var(--tint-blue)',
}

export function networkColor(id: string): string {
  return NETWORK_COLORS[id] ?? 'var(--text-muted)'
}

export function networkTint(id: string): string {
  return NETWORK_TINTS[id] ?? 'var(--tint-graphite)'
}
