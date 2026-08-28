import type { Network } from './network'
import type { SentimentLabel } from './topic'

/** Metadados de anúncio, como a Ad Library devolve — faixas, não valores exatos
 * (ver Metodologia). Só presente quando `network === 'meta_ads'`. */
export interface AdMetadata {
  investmentMinBRL: number
  investmentMaxBRL: number
  impressionsMin: number
  impressionsMax: number
  /** dias que o anúncio ficou/fica no ar, a partir de publishedAt */
  daysActive: number
  platforms: ('facebook' | 'instagram')[]
  headline: string
  domain: string
  cta: string
}

/** Example post/comment used in the topic drill-down, mirrors the Mongo raw layer. */
export interface TopicDocument {
  id: string
  topicId: string
  entityId: string
  network: Network
  author: string
  text: string
  publishedAt: string
  engagement: number
  sentiment: SentimentLabel
  ad?: AdMetadata
}

/** Um comentário de resposta sob uma publicação — o painel "Ver comentários" mostra a
 * thread inteira de um TopicDocument. Autor nunca é exposto (ver Metodologia/LGPD). */
export interface PublicationComment {
  id: string
  text: string
  sentiment: SentimentLabel
  votes: number
  hoursAgo: number
}
