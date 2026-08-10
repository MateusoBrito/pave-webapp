/**
 * Tópicos são globais — o BERTopic roda sobre o corpus inteiro (todos os candidatos),
 * alinhado entre redes (Fase 2). Quanto cada candidato fala de um tópico é um dado do
 * TopicSeriesPoint/TopicDocument (entityId), não do tópico em si — um tópico como
 * "Corrupção" pode ser predominantemente de um candidato, do outro, ou de ambos.
 */
export interface Topic {
  id: string
  label: string
  weight: number
  tags: string[]
}

/** Documents with low affinity to any existing topic — feed the next re-modelagem. */
export interface EmergentTopic {
  id: string
  label: string
  documentCount: number
}

/** Counts, not ratios — sums to the mentions/document count of whatever it's attached to. */
export interface TopicSentiment {
  negative: number
  neutral: number
  positive: number
}

export type SentimentLabel = 'negative' | 'neutral' | 'positive'
