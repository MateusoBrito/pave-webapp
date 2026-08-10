import { NETWORKS, type Network } from '../types'
import type {
  SentimentLabel,
  TopicDocument,
  TopicSentiment,
  TopicSeriesPoint,
} from '../types'
import { ENTITIES } from './entities'
import { TOPICS } from './topics'

// 180 dias — cobre com folga até o preset de 90d + seu período anterior de mesma duração
// (senão "variação vs. período anterior" sempre cairia fora do range gerado e daria 0%).
const DAYS = 180

/** Deterministic pseudo-random in [0, 1), seeded from a string — keeps mock data stable
 * across re-renders/HMR instead of reshuffling on every reload. */
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const x = Math.sin(hash) * 10000
  return x - Math.floor(x)
}

function isoDate(daysAgo: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/** YouTube/Reddit têm bem mais volume orgânico que os anúncios pagos da Meta Ad
 * Library, refletindo o status de viabilidade do plano (04 Fontes de dados). */
const NETWORK_VOLUME_FACTOR: Record<Network, number> = {
  youtube: 1,
  reddit: 0.8,
  meta_ads: 0.3,
}

/** 0 = tende a positivo/neutro, 1 = tende a negativo. Só um parâmetro de geração —
 * não faz parte do contrato real de dados; a análise de sentimento real (Fase 4) vai
 * produzir isso a partir do texto. */
const TOPIC_NEGATIVITY_BIAS: Record<string, number> = {
  'economia-inflacao': 0.55,
  'seguranca-publica': 0.6,
  'saude-sus': 0.5,
  'anistia-8-jan': 0.6,
  educacao: 0.35,
  corrupcao: 0.65,
  'meio-ambiente': 0.4,
}

/** Quanto do volume de cada tópico é atribuído a "lula" (o resto vai para o outro
 * candidato) — só geração; no pipeline real isso emerge de qual documento fala de quem. */
const TOPIC_LULA_SHARE: Record<string, number> = {
  'economia-inflacao': 0.78,
  'seguranca-publica': 0.15,
  'saude-sus': 0.82,
  'anistia-8-jan': 0.1,
  educacao: 0.75,
  corrupcao: 0.5,
  'meio-ambiente': 0.68,
}

function negativityBias(topicId: string): number {
  return TOPIC_NEGATIVITY_BIAS[topicId] ?? 0.4
}

function lulaShareOf(topicId: string): number {
  return TOPIC_LULA_SHARE[topicId] ?? 0.5
}

function sentimentShares(bias: number, seed: string) {
  const negative = bias * 0.55 + seededRandom(`${seed}-sn`) * 0.15
  const positive = (1 - bias) * 0.4 + seededRandom(`${seed}-sp`) * 0.15
  return { negative, positive }
}

function splitSentiment(mentions: number, bias: number, seed: string): TopicSentiment {
  if (mentions <= 0) return { negative: 0, neutral: 0, positive: 0 }
  const { negative: negShare, positive: posShare } = sentimentShares(bias, seed)
  let negative = Math.round(negShare * mentions)
  let positive = Math.round(posShare * mentions)

  if (negative + positive > mentions) {
    const overflow = negative + positive - mentions
    const trimPositive = Math.min(positive, overflow)
    positive -= trimPositive
    negative -= overflow - trimPositive
  }

  return { negative, neutral: mentions - negative - positive, positive }
}

function pickSentimentLabel(bias: number, seed: string): SentimentLabel {
  const { negative: negShare, positive: posShare } = sentimentShares(bias, seed)
  const r = seededRandom(`${seed}-pick`)
  if (r < negShare) return 'negative'
  if (r < negShare + posShare) return 'positive'
  return 'neutral'
}

function generateSeries(): TopicSeriesPoint[] {
  const points: TopicSeriesPoint[] = []

  for (const topic of TOPICS) {
    const bias = negativityBias(topic.id)
    const lulaShare = lulaShareOf(topic.id)

    for (const { id: network } of NETWORKS) {
      const base = topic.weight * 2600 * NETWORK_VOLUME_FACTOR[network]

      for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
        const date = isoDate(daysAgo)
        const seed = `${topic.id}-${network}-${date}`
        const noise = seededRandom(seed)
        // pico simulado a meio do período para dar "surgimento, pico e decaimento"
        const distanceFromPeak = Math.abs(daysAgo - DAYS / 2)
        const peakBoost = Math.max(0, 1 - distanceFromPeak / (DAYS / 2)) * 0.8
        const dayBase = base * (0.4 + noise * 0.6 + peakBoost)

        for (const entity of ENTITIES) {
          const entitySeed = `${seed}-${entity.id}`
          const share = entity.id === 'lula' ? lulaShare : 1 - lulaShare
          const entityNoise = 0.85 + seededRandom(entitySeed) * 0.3
          const mentions = Math.max(0, Math.round(dayBase * share * entityNoise))

          points.push({
            date,
            entityId: entity.id,
            network,
            topicId: topic.id,
            mentions,
            sentiment: splitSentiment(mentions, bias, entitySeed),
          })
        }
      }
    }
  }

  return points
}

const AUTHOR_PREFIXES = ['user', 'cidadao', 'obs_politica', 'voz_br', 'opiniao']

const TEMPLATES = [
  'Alguém mais reparou no que foi dito sobre {topic} essa semana?',
  'Achei importante o posicionamento sobre {topic}, precisa de mais debate.',
  'Não concordo com a condução de {topic}, deveria ser diferente.',
  'Resumo do que rolou hoje envolvendo {topic}: muita repercussão.',
  'Matéria nova saiu comentando {topic}, vale a pena conferir.',
  'Comentário da live de ontem sobre {topic} gerou bastante reação.',
]

function generateDocuments(): TopicDocument[] {
  const documents: TopicDocument[] = []
  let seq = 0

  for (const topic of TOPICS) {
    const bias = negativityBias(topic.id)
    const lulaShare = lulaShareOf(topic.id)

    for (let i = 0; i < 8; i++) {
      seq++
      const seed = `${topic.id}-doc-${i}`
      const networkIndex = Math.floor(seededRandom(seed + 'n') * NETWORKS.length)
      const network = NETWORKS[networkIndex].id
      const templateIndex = Math.floor(seededRandom(seed + 't') * TEMPLATES.length)
      const authorIndex = Math.floor(seededRandom(seed + 'a') * AUTHOR_PREFIXES.length)
      const daysAgo = Math.floor(seededRandom(seed + 'd') * DAYS)
      const entity =
        seededRandom(seed + 'ent') < lulaShare
          ? ENTITIES.find((e) => e.id === 'lula')!
          : ENTITIES.find((e) => e.id !== 'lula')!
      // anúncio paga por alcance/gasto, não por curtida — escala diferente do orgânico
      const engagementRange = network === 'meta_ads' ? 20000 : 1500

      documents.push({
        id: `doc-${seq}`,
        topicId: topic.id,
        entityId: entity.id,
        network,
        author: `${AUTHOR_PREFIXES[authorIndex]}_${Math.floor(seededRandom(seed + 'u') * 999)}`,
        text: TEMPLATES[templateIndex].replace('{topic}', topic.label.toLowerCase()),
        publishedAt: `${isoDate(daysAgo)}T${String(Math.floor(seededRandom(seed + 'h') * 24)).padStart(2, '0')}:00:00Z`,
        engagement: Math.round(seededRandom(seed + 'e') * engagementRange),
        sentiment: pickSentimentLabel(bias, seed),
      })
    }
  }

  return documents
}

export const MOCK_SERIES = generateSeries()
export const MOCK_DOCUMENTS = generateDocuments()
