import type { Network } from './network'
import type { SentimentLabel } from './topic'

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
}
