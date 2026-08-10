import type { Network } from './network'
import type { TopicSentiment } from './topic'

/** One row of the analytical aggregation: day x entity x network x topic. */
export interface TopicSeriesPoint {
  date: string 
  entityId: string
  network: Network
  topicId: string
  mentions: number
  sentiment: TopicSentiment
}

/** Daily mention volume for an entity, summed across topics/networks. */
export interface VolumePoint {
  date: string
  entityId: string
  mentions: number
}
