import { NETWORKS, type Network } from '../types'
import type {
  AdMetadata,
  PublicationComment,
  SentimentLabel,
  TopicDocument,
  TopicSentiment,
  TopicSeriesPoint,
} from '../types'
import { seededRandom } from '../lib/random'
import { ENTITIES } from './entities'
import { TOPICS } from './topics'

// 180 dias — cobre com folga até o preset de 90d + seu período anterior de mesma duração
// (senão "variação vs. período anterior" sempre cairia fora do range gerado e daria 0%).
const DAYS = 180

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
  'lula-economia-inflacao': 0.55,
  'lula-saude-sus': 0.5,
  'lula-educacao': 0.35,
  'lula-programas-sociais': 0.25,
  'lula-aprovacao': 0.5,
  'flavio-seguranca-publica': 0.6,
  'flavio-anistia-8-jan': 0.6,
  'flavio-processos': 0.65,
  'flavio-articulacao': 0.4,
  'flavio-agenda-economica': 0.35,
}

export function negativityBias(topicId: string): number {
  return TOPIC_NEGATIVITY_BIAS[topicId] ?? 0.4
}

/** Simula uma falha real de coleta — 3 dias sem nenhum dado, 10-12 dias atrás. Visível
 * nos presets 30d/90d, não no 7d (o incidente já passou). Também é o motivo de
 * "Cobertura da coleta" não mostrar sempre 100%. */
function isInCollectionGap(daysAgo: number): boolean {
  return daysAgo >= 10 && daysAgo <= 12
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

export function pickSentimentLabel(bias: number, seed: string): SentimentLabel {
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

    for (const { id: network } of NETWORKS) {
      const base = topic.weight * 2600 * NETWORK_VOLUME_FACTOR[network]

      for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
        const date = isoDate(daysAgo)
        const seed = `${topic.id}-${network}-${date}`
        const noise = seededRandom(seed)
        // pico simulado a meio do período para dar "surgimento, pico e decaimento"
        const distanceFromPeak = Math.abs(daysAgo - DAYS / 2)
        const peakBoost = Math.max(0, 1 - distanceFromPeak / (DAYS / 2)) * 0.8
        const mentions = isInCollectionGap(daysAgo)
          ? 0
          : Math.max(0, Math.round(base * (0.4 + noise * 0.6 + peakBoost)))

        points.push({
          date,
          entityId: topic.entityId,
          network,
          topicId: topic.id,
          mentions,
          sentiment: splitSentiment(mentions, bias, seed),
        })
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

const AD_HEADLINE_TEMPLATES = [
  'Saiba o que fizemos por {topic}',
  'Nosso plano para {topic}',
  'Resultados em {topic}',
  'Compromisso com {topic}',
]

const AD_CTA = 'Saiba mais'

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function domainFor(entityId: string): string {
  const entity = ENTITIES.find((e) => e.id === entityId)
  return `${slugify(entity?.name ?? entityId)}.com.br`
}

/** Metadados de anúncio derivados do gasto (`engagement`) — a Ad Library só devolve
 * faixas, não valores exatos, então a faixa é construída em torno do ponto gerado
 * (ver Metodologia). Impressões e dias no ar são proxies plausíveis, sem fonte real
 * ainda (ficam pra quando a Ad Library entrar de fato, Fase 3). */
function generateAdMetadata(
  topicLabel: string,
  entityId: string,
  seed: string,
  engagement: number,
): AdMetadata {
  const investmentMinBRL = Math.max(500, Math.round((engagement * 0.7) / 500) * 500)
  const investmentMaxBRL = Math.max(
    investmentMinBRL + 500,
    Math.round((engagement * 1.3) / 500) * 500,
  )
  const impressionsFactor = 15 + seededRandom(`${seed}-impf`) * 25
  const impressionsMid = Math.max(1000, Math.round(engagement * impressionsFactor))
  const impressionsMin = Math.round((impressionsMid * 0.7) / 1000) * 1000
  const impressionsMax = Math.round((impressionsMid * 1.4) / 1000) * 1000
  const daysActive = 3 + Math.floor(seededRandom(`${seed}-days`) * 42)

  const platformRoll = seededRandom(`${seed}-plat`)
  const platforms: AdMetadata['platforms'] =
    platformRoll < 0.34
      ? ['facebook']
      : platformRoll < 0.67
        ? ['instagram']
        : ['facebook', 'instagram']

  const headlineIndex = Math.floor(
    seededRandom(`${seed}-headline`) * AD_HEADLINE_TEMPLATES.length,
  )

  return {
    investmentMinBRL,
    investmentMaxBRL,
    impressionsMin,
    impressionsMax,
    daysActive,
    platforms,
    headline: AD_HEADLINE_TEMPLATES[headlineIndex].replace('{topic}', topicLabel),
    domain: domainFor(entityId),
    cta: AD_CTA,
  }
}

function generateDocuments(): TopicDocument[] {
  const documents: TopicDocument[] = []
  let seq = 0

  for (const topic of TOPICS) {
    const bias = negativityBias(topic.id)

    for (let i = 0; i < 8; i++) {
      seq++
      const seed = `${topic.id}-doc-${i}`
      const networkIndex = Math.floor(seededRandom(seed + 'n') * NETWORKS.length)
      const network = NETWORKS[networkIndex].id
      const templateIndex = Math.floor(seededRandom(seed + 't') * TEMPLATES.length)
      const authorIndex = Math.floor(seededRandom(seed + 'a') * AUTHOR_PREFIXES.length)
      const daysAgo = Math.floor(seededRandom(seed + 'd') * DAYS)
      // anúncio paga por alcance/gasto, não por curtida — escala diferente do orgânico
      const engagementRange = network === 'meta_ads' ? 20000 : 1500

      const engagement = Math.round(seededRandom(seed + 'e') * engagementRange)

      documents.push({
        id: `doc-${seq}`,
        topicId: topic.id,
        entityId: topic.entityId,
        network,
        author: `${AUTHOR_PREFIXES[authorIndex]}_${Math.floor(seededRandom(seed + 'u') * 999)}`,
        text: TEMPLATES[templateIndex].replace('{topic}', topic.label.toLowerCase()),
        publishedAt: `${isoDate(daysAgo)}T${String(Math.floor(seededRandom(seed + 'h') * 24)).padStart(2, '0')}:00:00Z`,
        engagement,
        sentiment: pickSentimentLabel(bias, seed),
        ad:
          network === 'meta_ads'
            ? generateAdMetadata(topic.label, topic.entityId, seed, engagement)
            : undefined,
      })
    }
  }

  return documents
}

const REPLY_TEMPLATES: Record<SentimentLabel, string[]> = {
  negative: [
    'Não concordo com a condução de {topic}, deveria ser diferente.',
    'Discurso não resolve nada sobre {topic}, na prática não muda.',
    'Cansei de promessa vazia sobre {topic}.',
    'Isso sobre {topic} só piora a cada mês, sinceramente.',
    'Falta muito pra {topic} funcionar de verdade.',
    'Só ouço desculpa quando o assunto é {topic}.',
    'Prometeram resolver {topic} e não vejo diferença nenhuma no dia a dia.',
    'Cadê o resultado prático em {topic}? Só vejo anúncio.',
    'Todo mundo fala de {topic}, mas quem sente na pele sabe que não mudou nada.',
    'Decepcionado com o rumo de {topic} esse ano.',
    'Já perdi a conta de quantas vezes prometeram mexer em {topic}.',
  ],
  neutral: [
    'Alguém tem mais dados sobre {topic}? Queria entender melhor.',
    'Resumo do que saiu hoje sobre {topic}, sem muita novidade.',
    'Ainda não tenho opinião formada sobre {topic}.',
    'Alguém tem a fonte desses números sobre {topic}?',
    'Vi isso passar em outro lugar também, sobre {topic}.',
    'Não sei se é bom ou ruim, só reparei na mudança em {topic}.',
    'Queria comparar {topic} com o que aconteceu no ano passado.',
    'Alguém consegue explicar melhor esse ponto sobre {topic}?',
  ],
  positive: [
    'Achei um avanço importante em {topic}, vamos ver se continua.',
    'Pela primeira vez sinto que {topic} está indo pro caminho certo.',
    'Reconheço o esforço em {topic}, espero que mantenha.',
    'Aqui na minha região {topic} melhorou nos últimos meses, sinceramente.',
    'Finalmente uma notícia boa sobre {topic}.',
    'Dessa vez pareceu diferente, {topic} andou pra frente de verdade.',
    'Fiquei surpreso positivamente com o avanço em {topic}.',
    'Vale reconhecer quando {topic} vai bem, e esse mês foi um exemplo.',
  ],
}

/** Total de comentários sob uma publicação — proxy plausível, sem fonte real ainda
 * (a Fase 3 traria a contagem real da API de cada plataforma). */
function commentCountFor(doc: TopicDocument): number {
  return 40 + Math.floor(seededRandom(`${doc.id}-total`) * 500)
}

/** Gera a thread inteira de comentários de uma publicação, sob demanda — só roda
 * quando o painel "Ver comentários" abre pra aquele documento específico, nunca no
 * carregamento inicial dos mocks (geraria milhares de objetos à toa). Determinístico
 * por doc.id, então reabrir o mesmo painel sempre mostra a mesma thread. */
export function generatePublicationComments(
  doc: TopicDocument,
  topicLabel: string,
): PublicationComment[] {
  const bias = negativityBias(doc.topicId)
  const total = commentCountFor(doc)
  const comments: PublicationComment[] = []

  for (let i = 0; i < total; i++) {
    const seed = `${doc.id}-comment-${i}`
    const sentiment = pickSentimentLabel(bias, seed)
    const pool = REPLY_TEMPLATES[sentiment]
    const templateIndex = Math.floor(seededRandom(`${seed}-t`) * pool.length)
    comments.push({
      id: `${doc.id}-c${i}`,
      text: pool[templateIndex].replace('{topic}', topicLabel.toLowerCase()),
      sentiment,
      votes: Math.round(seededRandom(`${seed}-v`) * 500),
      hoursAgo: 1 + Math.floor(seededRandom(`${seed}-h`) * 71),
    })
  }

  return comments
}

export const MOCK_SERIES = generateSeries()
export const MOCK_DOCUMENTS = generateDocuments()
