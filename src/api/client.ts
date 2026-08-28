import { NETWORKS } from '../types'
import type {
  Entity,
  Network,
  SentimentLabel,
  Topic,
  TopicDocument,
  TopicSentiment,
  TopicSeriesPoint,
} from '../types'
import { shortName } from '../lib/format'
import { seededRandom } from '../lib/random'
import {
  EMERGENT_TOPICS,
  ENTITIES,
  getCustomEntities,
  MOCK_DOCUMENTS,
  MOCK_SERIES,
  TOPICS,
} from '../mocks'

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

/** GET /entities — registro de entidades (candidatos + aliases). Inclui as entidades
 * que o usuário adicionou nesta sessão via "Adicionar candidato" (ver mocks/customEntities). */
export function getEntities(): Promise<Entity[]> {
  return delay([...ENTITIES, ...getCustomEntities()])
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

export const ORGANIC_NETWORKS: Network[] = NETWORKS.filter(
  (n) => n.id !== 'meta_ads',
).map((n) => n.id)

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

export interface TopicDetail {
  topic: Topic
  mentions: number
  /** share do tópico sobre o total de menções (todos os tópicos) no período filtrado */
  sharePct: number
  sentiment: TopicSentiment
  peakDate: string | undefined
  /** rede com mais menções para este tópico no período — mesmo cálculo de getTopicRanking */
  dominantNetwork: Network
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

  const byNetwork = new Map<Network, number>()
  for (const p of topicRows)
    byNetwork.set(p.network, (byNetwork.get(p.network) ?? 0) + p.mentions)
  const dominantNetwork =
    [...byNetwork.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ORGANIC_NETWORKS[0]

  return delay({
    topic,
    mentions,
    sharePct: (mentions / totalMentions) * 100,
    sentiment: sumSentiment(topicRows),
    peakDate,
    dominantNetwork,
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
  otherTopicsCount: number
  otherTopicsMentions: number
}

const COMPARISON_TOP_TOPICS = 7

/** GET /comparison/{entityId}/summary — painel de cada candidato no Comparativo. */
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
  const ranked = [...byTopic.entries()].sort((a, b) => b[1] - a[1])
  const topTopics = ranked
    .slice(0, COMPARISON_TOP_TOPICS)
    .map(([topicId, m]) => ({ topic: TOPICS.find((t) => t.id === topicId), mentions: m }))
    .filter((t): t is { topic: Topic; mentions: number } => t.topic !== undefined)
  const rest = ranked.slice(COMPARISON_TOP_TOPICS)

  return delay({
    entity,
    mentions,
    sentiment: sumSentiment(rows),
    topTopics,
    otherTopicsCount: rest.length,
    otherTopicsMentions: rest.reduce((sum, [, m]) => sum + m, 0),
  })
}

export interface CandidateSentimentPoint {
  date: string
  entityId: string
  negativePct: number
}

/** GET /comparison/negative-sentiment-series — % negativo por dia, por candidato,
 * comparável entre eles (Comparativo). Meta Ads não tem sentimento — sempre exclui. */
export function getNegativeSentimentOverTime(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[] = [],
): Promise<CandidateSentimentPoint[]> {
  const effectiveNetworks =
    networks.length > 0 ? networks.filter((n) => n !== 'meta_ads') : ORGANIC_NETWORKS
  if (networks.length > 0 && effectiveNetworks.length === 0) return delay([])

  const rows = filterSeries(period, { entityIds, networks: effectiveNetworks })
  const byKey = new Map<string, { negative: number; total: number }>()
  for (const p of rows) {
    const key = `${p.entityId}|${p.date}`
    const existing = byKey.get(key) ?? { negative: 0, total: 0 }
    existing.negative += p.sentiment.negative
    existing.total += p.sentiment.negative + p.sentiment.neutral + p.sentiment.positive
    byKey.set(key, existing)
  }

  const result: CandidateSentimentPoint[] = [...byKey.entries()].map(([key, v]) => {
    const [entityId, date] = key.split('|')
    return { date, entityId, negativePct: v.total > 0 ? (v.negative / v.total) * 100 : 0 }
  })
  return delay(result.sort((a, b) => a.date.localeCompare(b.date)))
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
export function getCandidatePosts(
  entityIds: string[],
  period?: PeriodFilter,
): Promise<TopicDocument[]> {
  return delay(
    MOCK_DOCUMENTS.filter(
      (d) =>
        d.network === 'meta_ads' &&
        (entityIds.length === 0 || entityIds.includes(d.entityId)) &&
        (!period || inPeriod(d.publishedAt.slice(0, 10), period)),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  )
}

function metaAdsDocs(entityIds: string[], period: PeriodFilter): TopicDocument[] {
  return MOCK_DOCUMENTS.filter(
    (d) =>
      d.network === 'meta_ads' &&
      d.ad !== undefined &&
      (entityIds.length === 0 || entityIds.includes(d.entityId)) &&
      inPeriod(d.publishedAt.slice(0, 10), period),
  )
}

/** Anúncio ainda ativo se sua janela declarada (publishedAt + dias no ar) cobre hoje. */
function isAdStillActive(doc: TopicDocument): boolean {
  if (!doc.ad) return false
  const end = new Date(doc.publishedAt)
  end.setUTCDate(end.getUTCDate() + doc.ad.daysActive)
  return end.getTime() >= Date.now()
}

export interface CandidateContentSummary {
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
  activeAdsCount: number
  impressionsMinTotal: number
  impressionsMaxTotal: number
}

/** GET /candidates/content-summary — KPIs do topo de "O que os candidatos postam?". */
export function getCandidateContentSummary(
  entityIds: string[],
  period: PeriodFilter,
): Promise<CandidateContentSummary> {
  const docs = metaAdsDocs(entityIds, period)
  return delay({
    investmentMinBRL: docs.reduce((sum, d) => sum + (d.ad?.investmentMinBRL ?? 0), 0),
    investmentMaxBRL: docs.reduce((sum, d) => sum + (d.ad?.investmentMaxBRL ?? 0), 0),
    adsCount: docs.length,
    activeAdsCount: docs.filter(isAdStillActive).length,
    impressionsMinTotal: docs.reduce((sum, d) => sum + (d.ad?.impressionsMin ?? 0), 0),
    impressionsMaxTotal: docs.reduce((sum, d) => sum + (d.ad?.impressionsMax ?? 0), 0),
  })
}

export interface AdTopicRankingRow {
  topic: Topic
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
}

/** GET /candidates/content/ranking — tópicos ordenados por investimento declarado. */
export function getAdTopicRanking(
  entityIds: string[],
  period: PeriodFilter,
  limit?: number,
): Promise<AdTopicRankingRow[]> {
  const docs = metaAdsDocs(entityIds, period)
  const byTopic = new Map<string, { min: number; max: number; count: number }>()
  for (const d of docs) {
    const cur = byTopic.get(d.topicId) ?? { min: 0, max: 0, count: 0 }
    cur.min += d.ad?.investmentMinBRL ?? 0
    cur.max += d.ad?.investmentMaxBRL ?? 0
    cur.count += 1
    byTopic.set(d.topicId, cur)
  }

  const rows: AdTopicRankingRow[] = [...byTopic.entries()]
    .map(([topicId, v]) => {
      const topic = TOPICS.find((t) => t.id === topicId)
      return topic
        ? { topic, investmentMinBRL: v.min, investmentMaxBRL: v.max, adsCount: v.count }
        : undefined
    })
    .filter((row): row is AdTopicRankingRow => row !== undefined)
    .sort(
      (a, b) =>
        b.investmentMinBRL +
        b.investmentMaxBRL -
        (a.investmentMinBRL + a.investmentMaxBRL),
    )

  return delay(limit ? rows.slice(0, limit) : rows)
}

export interface AdCandidateBreakdownRow {
  entity: Entity
  investmentMinBRL: number
  investmentMaxBRL: number
  adsCount: number
}

/** GET /candidates/content/by-candidate — investimento e volume de anúncios por
 * candidato, para comparar lado a lado quem investiu mais no período. */
export function getAdCandidateBreakdown(
  entityIds: string[],
  period: PeriodFilter,
): Promise<AdCandidateBreakdownRow[]> {
  const allEntities = [...ENTITIES, ...getCustomEntities()]
  const relevant =
    entityIds.length > 0
      ? allEntities.filter((e) => entityIds.includes(e.id))
      : allEntities
  const docs = metaAdsDocs([], period)

  const rows = relevant.map((entity) => {
    const own = docs.filter((d) => d.entityId === entity.id)
    return {
      entity,
      investmentMinBRL: own.reduce((sum, d) => sum + (d.ad?.investmentMinBRL ?? 0), 0),
      investmentMaxBRL: own.reduce((sum, d) => sum + (d.ad?.investmentMaxBRL ?? 0), 0),
      adsCount: own.length,
    }
  })

  return delay(
    rows.sort(
      (a, b) =>
        b.investmentMinBRL +
        b.investmentMaxBRL -
        (a.investmentMinBRL + a.investmentMaxBRL),
    ),
  )
}

/** Subreddits brasileiros cobertos pela coleta — não são candidatos, então não têm
 * como derivar dos dados de entidade; a lista mora aqui, junto do resto do domínio de
 * consulta do Reddit. */
const REDDIT_SUBREDDITS = [
  'r/brasil',
  'r/politica',
  'r/bolsonaro',
  'r/conversas',
  'r/brasilivre',
  'r/desabafos',
  'r/noticias',
  'r/enem',
]

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

/**
 * GET /topics/by-subdivision — "Tópicos por subreddit"/"Tópicos por canal". No
 * YouTube cada tópico já pertence a um candidato só, então a coluna dele é exata (o
 * canal oficial do próprio candidato). No Reddit não há essa correspondência — os
 * subreddits não são "donos" de ninguém — então o total real de menções do tópico
 * (mesmo cálculo do ranking) é repartido entre os 8 subreddits por um peso
 * determinístico, só pra visualizar onde a conversa tende a se concentrar; não é uma
 * contagem exata por subreddit (isso exigiria a Fase 3 com dado bruto por subreddit).
 */
export async function getTopicsBySubdivision(
  entityIds: string[],
  period: PeriodFilter,
  network: 'reddit' | 'youtube',
): Promise<SubdivisionMatrix> {
  const ranking = await getTopicRanking(entityIds, period, [network])

  if (network === 'youtube') {
    const allEntities = [...ENTITIES, ...getCustomEntities()]
    const relevant =
      entityIds.length > 0
        ? allEntities.filter((e) => entityIds.includes(e.id))
        : allEntities
    const columns = relevant.map((e) => ({
      key: e.id,
      label: `Canal do ${shortName(e.name)}`,
    }))
    const rows = ranking.map((r) => ({
      topic: r.topic,
      values: Object.fromEntries(
        columns.map((c) => [c.key, c.key === r.topic.entityId ? r.mentions : 0]),
      ),
    }))
    const maxValue = Math.max(1, ...rows.flatMap((r) => Object.values(r.values)))
    return { columns, rows, maxValue, unitLabel: 'comentários' }
  }

  const columns = REDDIT_SUBREDDITS.map((s) => ({ key: s, label: s }))
  const rows = ranking.map((r) => {
    const weights = columns.map((c) => 0.15 + seededRandom(`${r.topic.id}-${c.key}`))
    const weightSum = weights.reduce((a, b) => a + b, 0)
    const values = Object.fromEntries(
      columns.map((c, i) => [c.key, Math.round((weights[i] / weightSum) * r.mentions)]),
    )
    return { topic: r.topic, values }
  })
  const maxValue = Math.max(1, ...rows.flatMap((r) => Object.values(r.values)))
  return { columns, rows, maxValue, unitLabel: 'comentários' }
}

export interface CandidateSentimentSummary {
  entity: Entity
  sentiment: TopicSentiment
}

/** GET /candidates/sentiment — sentimento agregado por candidato numa rede orgânica só
 * (Reddit ou YouTube), pro card "Sentimento por candidato". */
export function getCandidateSentimentBreakdown(
  entityIds: string[],
  period: PeriodFilter,
  networks: Network[],
): Promise<CandidateSentimentSummary[]> {
  const allEntities = [...ENTITIES, ...getCustomEntities()]
  const relevant =
    entityIds.length > 0
      ? allEntities.filter((e) => entityIds.includes(e.id))
      : allEntities

  return delay(
    relevant.map((entity) => ({
      entity,
      sentiment: sumSentiment(filterSeries(period, { entityIds: [entity.id], networks })),
    })),
  )
}

/** GET /networks/{network}/documents — exemplos de publicações/comentários cruzando
 * todos os tópicos numa rede só, pro carrossel de "O que os usuários comentam?" (o
 * drill-down de tópico usa getTopicDocuments, que é escopado a um tópico). */
export function getNetworkDocuments(
  entityIds: string[],
  period: PeriodFilter,
  network: Network,
): Promise<TopicDocument[]> {
  return delay(
    MOCK_DOCUMENTS.filter(
      (d) =>
        d.network === network &&
        (entityIds.length === 0 || entityIds.includes(d.entityId)) &&
        inPeriod(d.publishedAt.slice(0, 10), period),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  )
}
