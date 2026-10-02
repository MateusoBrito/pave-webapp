import { NETWORKS } from '../types'
import type {
  Entity,
  MetaAdPlatform,
  Network,
  PublicationComment,
  SentimentLabel,
  Topic,
  TopicDocument,
  TopicSentiment,
} from '../types'
import { apiGet, apiGetOptional, periodParams } from './http'

export interface PeriodFilter {
  from: string

  to: string
}

export function getEntities(): Promise<Entity[]> {
  return apiGet<Entity[]>('/entities')
}

export function getTopics(): Promise<Topic[]> {
  return apiGet<Topic[]>('/topics')
}

export interface CollectionStatus {
  lastCollectionDate: string
  daysBehind: number
}

export function getCollectionStatus(): Promise<CollectionStatus> {
  return apiGet<CollectionStatus>('/collection/status')
}

export interface CandidateVolumePoint {
  date: string
  entityId: string
  mentions: number
}

export function getVolumeOverTime(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<CandidateVolumePoint[]> {
  return apiGet<CandidateVolumePoint[]>('/series/volume', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export interface NetworkMentions {
  network: Network
  mentions: number
  byEntity: { entityId: string; mentions: number }[]
}

export function getMentionsByNetwork(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<NetworkMentions[]> {
  return apiGet<NetworkMentions[]>('/series/by-network', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export interface ShareOfVoiceEntry {
  entityId: string
  mentions: number
  share: number
}

export function getShareOfVoice(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<ShareOfVoiceEntry[]> {
  return apiGet<ShareOfVoiceEntry[]>('/series/share-of-voice', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export interface OverviewSummary {
  totalMentions: number
  deltaPct: number

  organicSentiment: TopicSentiment
  predominantSentiment: SentimentLabel
  activeTopics: number
  emergentCount: number
  daysCovered: number
  totalDays: number
  totalNetworks: number
}

export function getOverviewSummary(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<OverviewSummary> {
  return apiGet<OverviewSummary>('/overview/summary', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export interface TopicRankingRow {
  topic: Topic
  mentions: number
  variationPct: number
  dominantNetwork: Network
  sentiment: TopicSentiment
}

export const ORGANIC_NETWORKS: Network[] = NETWORKS.filter(
  (n) => n.id !== 'meta_ads',
).map((n) => n.id)

export function getTopicRanking(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
  limit?: number,
  /** false = não cair no último dia disponível quando o dia pedido não tem modelo -
   * usado em telas onde o usuário escolheu esse dia explicitamente (ver
   * TopicsPage/DayFilterCard); default true (Visão Geral, sem dia explícito). */
  dayFallback: boolean = true,
): Promise<TopicRankingRow[]> {
  return apiGet<TopicRankingRow[]>('/topics/ranking', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
    limit,
    day_fallback: dayFallback,
  })
}

export interface TopicCalendarDay {
  date: string
  topLabel?: string
  mentions?: number
}

export interface TopicCalendarEntity {
  entityId: string
  days: TopicCalendarDay[]
}

export interface TopicCalendarResult {
  entities: TopicCalendarEntity[]
}

export function getTopicCalendar(
  entityIds: string[],
  network: Network,
  period: PeriodFilter,
  requireTopic: boolean = false,
): Promise<TopicCalendarResult> {
  return apiGet<TopicCalendarResult>('/topics/calendar', {
    ...periodParams(period),
    candidates: entityIds,
    network,
    require_topic: requireTopic,
  })
}

export interface TopicDetail {
  topic: Topic
  mentions: number

  sharePct: number
  sentiment: TopicSentiment
  peakDate: string | undefined

  dominantNetwork: Network

  /** Vigência do tópico (primeiro ao último documento atribuído a ele) - não um
   * período recebido do cliente. O drill-down reusa isso para as demais chamadas
   * da página em vez do filtro global, ver TopicDrilldownPage.tsx. */
  periodStart: string
  periodEnd: string
  description?: string | null
}

export function getTopicDetail(
  topicId: string,
  entityIds: string[],
  networks: Network[] = [],
): Promise<TopicDetail | undefined> {
  void entityIds
  return apiGetOptional<TopicDetail>(`/topics/${encodeURIComponent(topicId)}`, { networks })
}

/** Evolução por hora do tópico no drill-down — não é CandidateVolumePoint (diário,
 * usado por outras telas): `date` aqui carrega hora e minuto, um tópico já vive
 * inteiro dentro de um único dia (modelagem diária). */
export interface TopicHourlyVolumePoint {
  date: string
  entityId: string
  mentions: number
}

export function getTopicCandidateSeries(
  topicId: string,
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<TopicHourlyVolumePoint[]> {
  void entityIds
  return apiGet<TopicHourlyVolumePoint[]>(
    `/topics/${encodeURIComponent(topicId)}/series-by-candidate`,
    { ...periodParams(period), networks },
  )
}

/** Ponto do sentimento empilhado por hora do drill-down de tópico — `date` carrega
 * hora e minuto, mesmo motivo de TopicHourlyVolumePoint. */
export interface SentimentSeriesPoint {
  date: string
  sentiment: TopicSentiment
}

export function getSentimentSeries(
  topicId: string,
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<SentimentSeriesPoint[]> {
  void entityIds
  return apiGet<SentimentSeriesPoint[]>(
    `/topics/${encodeURIComponent(topicId)}/sentiment-series`,
    { ...periodParams(period), networks },
  )
}

export interface ComparisonCandidateSummary {
  entity: Entity
  mentions: number
  sentiment: TopicSentiment
  topTopics: { topic: Topic; mentions: number }[]
  otherTopicsCount: number
  otherTopicsMentions: number
}

export function getComparisonSummary(
  entityId: string,
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<ComparisonCandidateSummary | undefined> {
  return apiGetOptional<ComparisonCandidateSummary>(
    `/comparison/${encodeURIComponent(entityId)}/summary`,
    { ...periodParams(period), networks },
  )
}

export interface CandidateSentimentPoint {
  date: string
  entityId: string
  negativePct: number
  /** contagens dos três rótulos no dia — o Comparativo empilha por candidato */
  sentiment: TopicSentiment
}

export function getNegativeSentimentOverTime(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<CandidateSentimentPoint[]> {
  return apiGet<CandidateSentimentPoint[]>('/comparison/negative-sentiment-series', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export interface Highlight {
  kind: 'top_topic' | 'network_growth'
  title: string
  description: string
}

export function getHighlights(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<Highlight[]> {
  return apiGet<Highlight[]>('/overview/highlights', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export function getTopicDocuments(
  topicId: string,
  period: PeriodFilter,
  filters: { entityIds?: string[]; networks?: Network[] } = {},
): Promise<TopicDocument[]> {
  return apiGet<TopicDocument[]>(`/topics/${encodeURIComponent(topicId)}/documents`, {
    ...periodParams(period),
    networks: filters.networks,
  })
}

export function getCandidatePosts(
  entityIds: string[],
  period?: PeriodFilter,
  platforms: MetaAdPlatform[] = [],
): Promise<TopicDocument[]> {
  return apiGet<TopicDocument[]>('/candidates/posts', {
    ...(period ? periodParams(period) : {}),
    candidates: entityIds,
    platforms,
  })
}

export interface CandidateContentSummary {
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
  activeAdsCount: number
  impressionsMinTotal: number
  impressionsMaxTotal: number
}

export function getCandidateContentSummary(
  entityIds: string[],
  period: PeriodFilter,
  platforms: MetaAdPlatform[] = [],
): Promise<CandidateContentSummary> {
  return apiGet<CandidateContentSummary>('/candidates/content-summary', {
    ...periodParams(period),
    candidates: entityIds,
    platforms,
  })
}

export interface AdTopicRankingRow {
  topic: Topic
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
}

export function getAdTopicRanking(
  entityIds: string[],
  period: PeriodFilter,
  platforms: MetaAdPlatform[] = [],
  limit?: number,
): Promise<AdTopicRankingRow[]> {
  return apiGet<AdTopicRankingRow[]>('/candidates/content/ranking', {
    ...periodParams(period),
    candidates: entityIds,
    platforms,
    limit,
  })
}

export interface AdTopicDetail {
  topic: Topic
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
  /** Vigência do tópico (primeiro ao último anúncio atribuído a ele) - mesma lógica de
   * TopicDetail.periodStart/periodEnd. */
  periodStart: string
  periodEnd: string
}

/** Drill-down próprio para tópico de anúncio - /topics/{id} (getTopicDetail) é
 * hard-restrito a redes orgânicas, um tópico de anúncio nunca resolve lá. */
export function getAdTopicDetail(
  topicId: string,
  platforms: MetaAdPlatform[] = [],
): Promise<AdTopicDetail | undefined> {
  return apiGetOptional<AdTopicDetail>(
    `/candidates/content/topics/${encodeURIComponent(topicId)}`,
    { platforms },
  )
}

export function getAdTopicSeries(
  topicId: string,
  period: PeriodFilter,
  platforms: MetaAdPlatform[] = [],
): Promise<CandidateVolumePoint[]> {
  return apiGet<CandidateVolumePoint[]>(
    `/candidates/content/topics/${encodeURIComponent(topicId)}/series`,
    { ...periodParams(period), platforms },
  )
}

export interface SubdivisionColumn {
  key: string
  label: string
}

export interface SubdivisionRow {
  topic: Topic
  values: Record<string, number>
}

export interface SubdivisionMatrix {
  columns: SubdivisionColumn[]
  rows: SubdivisionRow[]
  maxValue: number
  unitLabel: string
}

export function getTopicsBySubdivision(
  entityIds: string[],
  period: PeriodFilter,
  network: 'reddit' | 'youtube',
): Promise<SubdivisionMatrix> {
  return apiGet<SubdivisionMatrix>('/topics/by-subdivision', {
    ...periodParams(period),
    candidates: entityIds,
    network,
  })
}

export interface CandidateSentimentSummary {
  entity: Entity
  sentiment: TopicSentiment
}

export function getCandidateSentimentBreakdown(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[],
): Promise<CandidateSentimentSummary[]> {
  return apiGet<CandidateSentimentSummary[]>('/candidates/sentiment', {
    ...periodParams(period),
    candidates: entityIds,
    networks,
  })
}

export function getNetworkDocuments(
  entityIds: string[],
  period: PeriodFilter,
  network: Network,
): Promise<TopicDocument[]> {
  return apiGet<TopicDocument[]>(`/networks/${encodeURIComponent(network)}/documents`, {
    ...periodParams(period),
    candidates: entityIds,
  })
}

export interface PublicationCommentsQuery {
  documentId: string

  sentiment?: SentimentLabel
  sort?: 'top' | 'recent'
  limit?: number
  offset?: number
}

export interface PublicationCommentsResult {
  document: TopicDocument
  topic: Topic
  entity: Entity | undefined

  contextLabel: string

  totalBySentiment: TopicSentiment

  totalFiltered: number
  comments: PublicationComment[]
}

export function getPublicationComments(
  query: PublicationCommentsQuery,
): Promise<PublicationCommentsResult | undefined> {
  const { documentId, sentiment, sort = 'top', limit = 20, offset = 0 } = query
  return apiGetOptional<PublicationCommentsResult>(
    `/documents/${encodeURIComponent(documentId)}/comments`,
    { sentiment, sort, limit, offset },
  )
}

export interface CandidateTopicListRow extends TopicRankingRow {
  sharePct: number
}

export interface CandidateTopicListQuery {
  entityId: string
  network: Network
  period: PeriodFilter
  search?: string
  filter?: 'all' | 'emerging' | 'declining'
  sort?: 'mentions' | 'alpha'
  limit?: number
}

export interface CandidateTopicListResult {
  entity: Entity | undefined
  network: Network

  totalTopics: number
  totalMentions: number
  rows: CandidateTopicListRow[]

  totalFiltered: number

  remainingMentions: number
}

export function getCandidateTopicList(
  query: CandidateTopicListQuery,
): Promise<CandidateTopicListResult> {
  const { entityId, network, period, search, filter, sort, limit } = query
  return apiGet<CandidateTopicListResult>(
    `/candidates/${encodeURIComponent(entityId)}/topics`,
    { ...periodParams(period), network, search, filter, sort, limit },
  )
}

/** Registro de candidatos cadastráveis (`/registry/candidates`, schema RegistryCandidate
 * em api/app/schemas/domain.py). A MethodologyPage usa para listar quem é monitorado. */
export interface RegistryCandidate {
  id: string
  name: string
  apelidos: number
  termos: number
  monitorada: boolean
}

export function getCandidateRegistry(): Promise<RegistryCandidate[]> {
  return apiGet<RegistryCandidate[]>('/registry/candidates')
}
