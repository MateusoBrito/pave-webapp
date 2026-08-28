/**
 * Cada tópico pertence a um candidato só — o modelo (BERTopic) roda sobre o corpus
 * de cada candidato separadamente, alinhado entre redes (Fase 2). Não existe tópico
 * compartilhado entre candidatos.
 */
export interface Topic {
  id: string
  entityId: string
  label: string
  /** overall share of the entity's own documents this topic represents, 0-1 */
  weight: number
  tags: string[]
  /** true nos primeiros ciclos após o tópico entrar no modelo — vira "novo"/"emergente"
   * na UI; diferente de EmergentTopic, que ainda nem virou tópico. */
  emergent?: boolean
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
