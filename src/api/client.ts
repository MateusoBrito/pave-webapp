import { NETWORKS } from '../types'
import type {
  EmergentTopic,
  Entity,
  Network,
  SentimentLabel,
  Topic,
  TopicDocument,
  TopicSentiment,
  TopicSeriesPoint,
} from '../types'
import { EMERGENT_TOPICS, ENTITIES, MOCK_DOCUMENTS, MOCK_SERIES, TOPICS } from '../mocks'

/**
 * Camada de acesso a dados. Hoje lê dos mocks com uma latência simulada; quando o
 * FastAPI (Fase 3) existir, cada função aqui vira um `fetch` contra o endpoint
 * correspondente, sem mudar assinatura — nenhuma página/componente precisa mudar.
 */

const SIMULATED_LATENCY_MS = 150

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

export interface PeriodFilter {
  /** ISO yyyy-mm-dd, inclusive */
  from: string
  /** ISO yyyy-mm-dd, inclusive */
  to: string
}

function inPeriod(date: string, period: PeriodFilter): boolean {
  return date >= period.from && date <= period.to
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000) + 1
}

/** Período imediatamente anterior, mesma duração — base para "variação vs. período anterior". */
function previousPeriod(period: PeriodFilter): PeriodFilter {
  const length = daysBetween(period.from, period.to)
  const to = new Date(`${period.from}T00:00:00Z`)
  to.setUTCDate(to.getUTCDate() - 1)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (length - 1))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function sumSentiment(points: { sentiment: TopicSentiment }[]): TopicSentiment {
  return points.reduce(
    (acc, p) => ({
      negative: acc.negative + p.sentiment.negative,
      neutral: acc.neutral + p.sentiment.neutral,
      positive: acc.positive + p.sentiment.positive,
    }),
    { negative: 0, neutral: 0, positive: 0 },
  )
}

function predominantOf(sentiment: TopicSentiment): SentimentLabel {
  if (
    sentiment.negative >= sentiment.neutral &&
    sentiment.negative >= sentiment.positive
  ) {
    return 'negative'
  }
  return sentiment.positive >= sentiment.neutral ? 'positive' : 'neutral'
}

interface SeriesFilters {
  entityIds?: string[]
  networks?: Network[]
  topicIds?: string[]
}

/** Filtro central sobre a camada bruta mockada — arrays vazios/undefined = "todas". */
function filterSeries(
  period: PeriodFilter,
  filters: SeriesFilters = {},
): TopicSeriesPoint[] {
  const { entityIds, networks, topicIds } = filters
  return MOCK_SERIES.filter(
    (p) =>
      inPeriod(p.date, period) &&
      (!entityIds || entityIds.length === 0 || entityIds.includes(p.entityId)) &&
      (!networks || networks.length === 0 || networks.includes(p.network)) &&
      (!topicIds || topicIds.length === 0 || topicIds.includes(p.topicId)),
  )
}

/** GET /entities — registro de entidades (candidatos + aliases). */
export function getEntities(): Promise<Entity[]> {
  return delay(ENTITIES)
}

/** GET /topics — tópicos globais alinhados entre redes (Fase 2). */
export function getTopics(): Promise<Topic[]> {
  return delay([...TOPICS].sort((a, b) => b.weight - a.weight))
}

export interface CollectionStatus {
  lastCollectionDate: string // ISO yyyy-mm-dd
  daysBehind: number
}

/** GET /collection/status — chip "última coleta" no topo, sempre visível. */
export function getCollectionStatus(): Promise<CollectionStatus> {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return delay({ lastCollectionDate: d.toISOString().slice(0, 10), daysBehind: 1 })
}

export interface SeriesQuery {
  entityIds?: string[]
  networks?: Network[]
  topicIds?: string[]
  period: PeriodFilter
}

/** GET /series — pontos brutos filtrados; consumidores agregam via lib/chartData. */
export function getTopicSeries(query: SeriesQuery): Promise<TopicSeriesPoint[]> {
  return delay(filterSeries(query.period, query))
}

export interface CandidateVolumePoint {
  date: string
  entityId: string
  mentions: number
}

/** GET /series/volume — menções diárias por candidato, somado entre tópicos/redes. */
export function getVolumeOverTime(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<CandidateVolumePoint[]> {
  const rows = filterSeries(period, { entityIds, networks })
  const byKey = new Map<string, CandidateVolumePoint>()
  for (const p of rows) {
    const key = `${p.entityId}|${p.date}`
    const existing = byKey.get(key)
    if (existing) existing.mentions += p.mentions
    else byKey.set(key, { date: p.date, entityId: p.entityId, mentions: p.mentions })
  }
  return delay(Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date)))
}

export interface NetworkMentions {
  network: Network
  mentions: number
  byEntity: { entityId: string; mentions: number }[]
}

/** GET /series/by-network — menções por rede, com a divisão por candidato dentro
 * de cada barra (para o gráfico empilhado da Visão Geral). */
export function getMentionsByNetwork(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<NetworkMentions[]> {
  const relevant = entityIds.length > 0 ? entityIds : ENTITIES.map((e) => e.id)
  const rows = filterSeries(period, { entityIds: relevant, networks })

  return delay(
    NETWORKS.map((n) => {
      const networkRows = rows.filter((p) => p.network === n.id)
      const byEntity = relevant.map((entityId) => ({
        entityId,
        mentions: networkRows
          .filter((p) => p.entityId === entityId)
          .reduce((sum, p) => sum + p.mentions, 0),
      }))
      return {
        network: n.id,
        mentions: byEntity.reduce((sum, e) => sum + e.mentions, 0),
        byEntity,
      }
    }),
  )
}

export interface ShareOfVoiceEntry {
  entityId: string
  mentions: number
  share: number // 0-1
}

/** GET /series/share-of-voice — participação de cada candidato no total de menções. */
export function getShareOfVoice(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<ShareOfVoiceEntry[]> {
  const relevant = entityIds.length > 0 ? entityIds : ENTITIES.map((e) => e.id)
  const rows = filterSeries(period, { entityIds: relevant, networks })
  const totals = new Map<string, number>(relevant.map((id) => [id, 0]))
  for (const p of rows) {
    if (totals.has(p.entityId))
      totals.set(p.entityId, (totals.get(p.entityId) ?? 0) + p.mentions)
  }
  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1
  return delay(
    relevant.map((id) => ({
      entityId: id,
      mentions: totals.get(id) ?? 0,
      share: (totals.get(id) ?? 0) / grandTotal,
    })),
  )
}

export interface OverviewSummary {
  totalMentions: number
  deltaPct: number
  /** sentimento só das redes orgânicas — anúncio pago não é "clima do debate" público */
  organicSentiment: TopicSentiment
  predominantSentiment: SentimentLabel
  activeTopics: number
  emergentCount: number
  daysCovered: number
  totalDays: number
  totalNetworks: number
}

/** GET /overview/summary — os KPIs do topo da Visão Geral. */
export function getOverviewSummary(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<OverviewSummary> {
  const rows = filterSeries(period, { entityIds, networks })
  const totalMentions = rows.reduce((sum, p) => sum + p.mentions, 0)

  const prevRows = filterSeries(previousPeriod(period), { entityIds, networks })
  const prevTotal = prevRows.reduce((sum, p) => sum + p.mentions, 0)
  const deltaPct = prevTotal > 0 ? ((totalMentions - prevTotal) / prevTotal) * 100 : 0

  const organicNetworks = NETWORKS.filter((n) => n.id !== 'meta_ads').map((n) => n.id)
  const effectiveOrganic =
    networks.length > 0 ? networks.filter((n) => n !== 'meta_ads') : organicNetworks
  // mesma ressalva do getTopicRanking: filtro só-Meta-Ads não deve "voltar" a mostrar tudo
  const organicRows =
    networks.length > 0 && effectiveOrganic.length === 0
      ? []
      : filterSeries(period, { entityIds, networks: effectiveOrganic })
  const organicSentiment = sumSentiment(organicRows)

  const withData = rows.filter((p) => p.mentions > 0)

  return delay({
    totalMentions,
    deltaPct,
    organicSentiment,
    predominantSentiment: predominantOf(organicSentiment),
    activeTopics: new Set(withData.map((p) => p.topicId)).size,
    emergentCount: EMERGENT_TOPICS.length,
    daysCovered: new Set(withData.map((p) => p.date)).size,
    totalDays: daysBetween(period.from, period.to),
    totalNetworks: networks.length > 0 ? networks.length : NETWORKS.length,
  })
}

export interface TopicRankingRow {
  topic: Topic
  mentions: number
  variationPct: number
  dominantNetwork: Network
  sentiment: TopicSentiment
}

const ORGANIC_NETWORKS: Network[] = NETWORKS.filter((n) => n.id !== 'meta_ads').map(
  (n) => n.id,
)

/**
 * GET /topics/ranking — linhas da tabela (Visão Geral) e da lista de ranking (Tópicos).
 * Exclui Meta Ads sempre: anúncio pago é conteúdo do candidato, não conversa do público.
 * Cada tópico já pertence a um candidato só (Topic.entityId) — nada a "dominar" aqui.
 */
export function getTopicRanking(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
  limit?: number,
): Promise<TopicRankingRow[]> {
  const effectiveNetworks =
    networks.length > 0 ? networks.filter((n) => n !== 'meta_ads') : ORGANIC_NETWORKS

  // usuário filtrou só pra Meta Ads — não sobra rede orgânica nenhuma, e "sem restrição"
  // (array vazio) tem outro significado em filterSeries ("todas"), então cortamos aqui.
  if (networks.length > 0 && effectiveNetworks.length === 0) return delay([])

  const relevantTopics =
    entityIds.length > 0 ? TOPICS.filter((t) => entityIds.includes(t.entityId)) : TOPICS

  const rows = filterSeries(period, { entityIds, networks: effectiveNetworks })
  const prevRows = filterSeries(previousPeriod(period), {
    entityIds,
    networks: effectiveNetworks,
  })

  const result: TopicRankingRow[] = relevantTopics
    .map((topic) => {
      const topicRows = rows.filter((p) => p.topicId === topic.id)
      const mentions = topicRows.reduce((sum, p) => sum + p.mentions, 0)

      const prevMentions = prevRows
        .filter((p) => p.topicId === topic.id)
        .reduce((sum, p) => sum + p.mentions, 0)
      const variationPct =
        prevMentions > 0 ? ((mentions - prevMentions) / prevMentions) * 100 : 0

      const byNetwork = new Map<Network, number>()
      for (const p of topicRows)
        byNetwork.set(p.network, (byNetwork.get(p.network) ?? 0) + p.mentions)
      const dominantNetwork =
        [...byNetwork.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        ORGANIC_NETWORKS[0]

      return {
        topic,
        mentions,
        variationPct,
        dominantNetwork,
        sentiment: sumSentiment(topicRows),
      }
    })
    .filter((row) => row.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)

  return delay(limit ? result.slice(0, limit) : result)
}

export interface TopicNetworkMatrixRow {
  topic: Topic
  /** intensidade relativa 0-1, normalizada dentro da própria linha */
  byNetwork: Record<Network, number>
}

/** GET /topics/by-network — matriz p/ o heatmap "Tópicos por rede social". */
export function getTopicsByNetworkMatrix(
  entityIds: string[],
  period: PeriodFilter,
): Promise<TopicNetworkMatrixRow[]> {
  const rows = filterSeries(period, { entityIds })

  const result: TopicNetworkMatrixRow[] = TOPICS.map((topic) => {
    const topicRows = rows.filter((p) => p.topicId === topic.id)
    const raw = new Map<Network, number>(NETWORKS.map((n) => [n.id, 0]))
    for (const p of topicRows) raw.set(p.network, (raw.get(p.network) ?? 0) + p.mentions)
    const max = Math.max(...raw.values(), 1)
    const byNetwork = Object.fromEntries(
      NETWORKS.map((n) => [n.id, (raw.get(n.id) ?? 0) / max]),
    ) as Record<Network, number>
    return { topic, byNetwork }
  }).filter((row) => Object.values(row.byNetwork).some((v) => v > 0))

  return delay(result)
}

/** GET /topics/emergent — documentos com baixa afinidade a qualquer tópico vigente. */
export function getEmergentTopics(): Promise<EmergentTopic[]> {
  return delay(EMERGENT_TOPICS)
}

export interface TopicDetail {
  topic: Topic
  mentions: number
  /** share do tópico sobre o total de menções (todos os tópicos) no período filtrado */
  sharePct: number
  sentiment: TopicSentiment
  peakDate: string | undefined
}

/** GET /topics/{id} — cabeçalho do drill-down: tags, menções, share, sentimento, pico. */
export function getTopicDetail(
  topicId: string,
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<TopicDetail | undefined> {
  const topic = TOPICS.find((t) => t.id === topicId)
  if (!topic) return delay(undefined)

  const allRows = filterSeries(period, { entityIds, networks })
  const topicRows = allRows.filter((p) => p.topicId === topicId)
  const mentions = topicRows.reduce((sum, p) => sum + p.mentions, 0)
  const totalMentions = allRows.reduce((sum, p) => sum + p.mentions, 0) || 1

  const byDate = new Map<string, number>()
  for (const p of topicRows) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.mentions)
  const peakDate = [...byDate.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  return delay({
    topic,
    mentions,
    sharePct: (mentions / totalMentions) * 100,
    sentiment: sumSentiment(topicRows),
    peakDate,
  })
}

/** GET /topics/{id}/series-by-candidate — "Evolução do tópico" por candidato, no drill-down. */
export function getTopicCandidateSeries(
  topicId: string,
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<CandidateVolumePoint[]> {
  const rows = filterSeries(period, { entityIds, networks, topicIds: [topicId] })
  const byKey = new Map<string, CandidateVolumePoint>()
  for (const p of rows) {
    const key = `${p.entityId}|${p.date}`
    const existing = byKey.get(key)
    if (existing) existing.mentions += p.mentions
    else byKey.set(key, { date: p.date, entityId: p.entityId, mentions: p.mentions })
  }
  return delay(Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date)))
}

export interface SentimentSeriesPoint {
  date: string
  sentiment: TopicSentiment
}

/** GET /topics/{id}/sentiment-series — série diária p/ o gráfico empilhado do drill-down. */
export function getSentimentSeries(
  topicId: string,
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<SentimentSeriesPoint[]> {
  const rows = filterSeries(period, { entityIds, networks, topicIds: [topicId] })
  const byDate = new Map<string, TopicSentiment>()
  for (const p of rows) {
    const existing = byDate.get(p.date) ?? { negative: 0, neutral: 0, positive: 0 }
    existing.negative += p.sentiment.negative
    existing.neutral += p.sentiment.neutral
    existing.positive += p.sentiment.positive
    byDate.set(p.date, existing)
  }
  return delay(
    Array.from(byDate.entries())
      .map(([date, sentiment]) => ({ date, sentiment }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  )
}

export interface ComparisonCandidateSummary {
  entity: Entity
  mentions: number
  sentiment: TopicSentiment
  topTopics: { topic: Topic; mentions: number }[]
}

/** GET /comparison/{entityId}/summary — card de cada candidato no Comparativo. */
export function getComparisonSummary(
  entityId: string,
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<ComparisonCandidateSummary | undefined> {
  const entity = ENTITIES.find((e) => e.id === entityId)
  if (!entity) return delay(undefined)

  const rows = filterSeries(period, { entityIds: [entityId], networks })
  const mentions = rows.reduce((sum, p) => sum + p.mentions, 0)

  const byTopic = new Map<string, number>()
  for (const p of rows) byTopic.set(p.topicId, (byTopic.get(p.topicId) ?? 0) + p.mentions)
  const topTopics = [...byTopic.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topicId, m]) => ({ topic: TOPICS.find((t) => t.id === topicId), mentions: m }))
    .filter((t): t is { topic: Topic; mentions: number } => t.topic !== undefined)

  return delay({ entity, mentions, sentiment: sumSentiment(rows), topTopics })
}

export interface Highlight {
  kind: 'top_topic' | 'network_growth'
  title: string
  description: string
}

/**
 * GET /overview/highlights — 1-2 frases de destaque geradas a partir dos mesmos
 * agregados de `getTopicRanking`/`getMentionsByNetwork`, sem fonte de dado nova.
 */
export function getHighlights(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<Highlight[]> {
  const highlights: Highlight[] = []
  const rows = filterSeries(period, { entityIds, networks })
  const prevRows = filterSeries(previousPeriod(period), { entityIds, networks })

  const byTopic = new Map<string, number>()
  for (const p of rows) byTopic.set(p.topicId, (byTopic.get(p.topicId) ?? 0) + p.mentions)
  const topTopicEntry = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0]
  const topTopic = topTopicEntry
    ? TOPICS.find((t) => t.id === topTopicEntry[0])
    : undefined
  if (topTopic) {
    highlights.push({
      kind: 'top_topic',
      title: `${topTopic.label} lidera a atenção.`,
      description: 'Foi o assunto que mais ocupou espaço na conversa no período.',
    })
  }

  const byNetwork = new Map<Network, number>()
  const prevByNetwork = new Map<Network, number>()
  for (const p of rows)
    byNetwork.set(p.network, (byNetwork.get(p.network) ?? 0) + p.mentions)
  for (const p of prevRows)
    prevByNetwork.set(p.network, (prevByNetwork.get(p.network) ?? 0) + p.mentions)

  let bestNetwork: Network | undefined
  let bestGrowth = 0
  for (const n of NETWORKS) {
    const current = byNetwork.get(n.id) ?? 0
    const prev = prevByNetwork.get(n.id) ?? 0
    if (prev <= 0 || current <= 0) continue
    const growth = ((current - prev) / prev) * 100
    if (growth > bestGrowth) {
      bestGrowth = growth
      bestNetwork = n.id
    }
  }
  if (bestNetwork) {
    const networkLabel = NETWORKS.find((n) => n.id === bestNetwork)?.label ?? bestNetwork
    highlights.push({
      kind: 'network_growth',
      title: `Presença ganhou força no ${networkLabel}.`,
      description: `O volume no ${networkLabel} foi ${bestGrowth.toFixed(0)}% maior que no período anterior.`,
    })
  }

  return delay(highlights)
}

/** GET /topics/{topicId}/documents — exemplos de posts p/ drill-down. */
export function getTopicDocuments(
  topicId: string,
  filters: { entityIds?: string[]; networks?: Network[] } = {},
): Promise<TopicDocument[]> {
  const { entityIds = [], networks = [] } = filters
  return delay(
    MOCK_DOCUMENTS.filter(
      (d) =>
        d.topicId === topicId &&
        (entityIds.length === 0 || entityIds.includes(d.entityId)) &&
        (networks.length === 0 || networks.includes(d.network)),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  )
}

/**
 * GET /candidates/posts — anúncios pagos postados pelos próprios candidatos (Meta Ad
 * Library). Sempre só `meta_ads`, independente do filtro de rede: é o que o candidato
 * publica, não conversa do público em outras redes.
 */
export function getCandidatePosts(entityIds: string[]): Promise<TopicDocument[]> {
  return delay(
    MOCK_DOCUMENTS.filter(
      (d) =>
        d.network === 'meta_ads' &&
        (entityIds.length === 0 || entityIds.includes(d.entityId)),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  )
}
