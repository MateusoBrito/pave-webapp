import { Megaphone, MessageSquare, Play } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useParams } from 'react-router-dom'
import type { PeriodFilter } from '../api/client'
import {
  getEntities,
  getSentimentSeries,
  getTopicCandidateSeries,
  getTopicDetail,
  getTopicDocuments,
  ORGANIC_NETWORKS,
} from '../api/client'
import { SentimentDonut } from '../components/dashboard/SentimentDonut'
import { SentimentOverTimeChart } from '../components/dashboard/SentimentOverTimeChart'
import { TopicExamplePosts } from '../components/dashboard/TopicExamplePosts'
import { TopicHeader } from '../components/dashboard/TopicHeader'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { Avatar } from '../components/ui/Avatar'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { candidateColor, networkColor, networkTint } from '../lib/colors'
import { formatFullDate } from '../lib/dates'
import type { Network } from '../types'

const NETWORK_ICON: Record<Network, LucideIcon> = {
  youtube: Play,
  reddit: MessageSquare,
  meta_ads: Megaphone,
}
const NETWORK_LABEL: Record<Network, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  meta_ads: 'Meta Ads',
}

// O tópico já nasce associado a um candidato e a uma rede (ver FilterBar.tsx) — os
// filtros globais de candidato/rede/período não se aplicam aqui. O período em si
// também não: em vez do filtro global, a página sempre olha pra vigência do próprio
// tópico (primeiro ao último documento atribuído a ele, ver detail.periodStart/End) -
// um tópico não "muda" com o período, só os documentos que aparecem embaixo mudariam,
// e olhar uma janela arbitrária corria o risco de cortar a maior parte da atividade
// real dele. Rede sempre fica restrita às orgânicas (YouTube/Reddit): Meta Ads é
// conteúdo pago do próprio candidato, não conversa do público.
const NO_ENTITY_RESTRICTION: string[] = []

export function TopicDrilldownPage() {
  const { topicId } = useParams<{ topicId: string }>()

  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useAsync(
    () =>
      topicId
        ? getTopicDetail(topicId, NO_ENTITY_RESTRICTION, ORGANIC_NETWORKS)
        : Promise.resolve(undefined),
    [topicId],
  )

  // cada tópico pertence a um candidato só
  const ownerEntity = detail
    ? entities.find((e) => e.id === detail.topic.entityId)
    : undefined
  const topicOwnerEntities = ownerEntity ? [ownerEntity] : []

  const topicPeriod: PeriodFilter | undefined = detail
    ? { from: detail.periodStart, to: detail.periodEnd }
    : undefined
  const seriesDeps = [topicId, detail?.periodStart, detail?.periodEnd]
  // VolumeOverTimeChart lê `.from`/`.to` incondicionalmente (detectGapRanges), mesmo
  // enquanto `loading=true` - precisa de algum período válido já no primeiro render,
  // antes da vigência do tópico chegar. O valor não importa: `points` ainda está vazio
  // nesse momento, então não há gap nenhum pra calcular de verdade.
  const today = new Date().toISOString().slice(0, 10)
  const chartPeriod: PeriodFilter = topicPeriod ?? { from: today, to: today }

  usePageHeader(
    'Detalhes do Tópico',
    detail
      ? `${detail.topic.label} · ${formatFullDate(detail.periodStart)} – ${formatFullDate(detail.periodEnd)}`
      : '...',
  )

  const {
    data: candidateSeries = [],
    loading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useAsync(
    () =>
      topicId && topicPeriod
        ? getTopicCandidateSeries(topicId, NO_ENTITY_RESTRICTION, topicPeriod, ORGANIC_NETWORKS)
        : Promise.resolve([]),
    seriesDeps,
  )
  const {
    data: sentimentSeries = [],
    loading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment,
  } = useAsync(
    () =>
      topicId && topicPeriod
        ? getSentimentSeries(topicId, NO_ENTITY_RESTRICTION, topicPeriod, ORGANIC_NETWORKS)
        : Promise.resolve([]),
    seriesDeps,
  )
  const {
    data: documents = [],
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(
    () =>
      topicId && topicPeriod
        ? getTopicDocuments(topicId, topicPeriod, {
            entityIds: NO_ENTITY_RESTRICTION,
            networks: ORGANIC_NETWORKS,
          })
        : Promise.resolve([]),
    seriesDeps,
  )

  const entityColor = ownerEntity ? candidateColor(ownerEntity.id) : 'var(--color-primary)'
  const network = detail?.dominantNetwork
  const NetworkIcon = network ? NETWORK_ICON[network] : undefined

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {ownerEntity && (
          <span
            className="flex items-center gap-2.5 rounded-xl py-2 pr-4 pl-2"
            style={{ backgroundColor: `${entityColor}1a` }}
          >
            <Avatar
              name={ownerEntity.name}
              color={entityColor}
              size={36}
              photoUrl={ownerEntity.photoUrl}
            />
            <span className="text-lg font-bold" style={{ color: entityColor }}>
              {ownerEntity.name}
            </span>
          </span>
        )}
        {network && NetworkIcon && (
          <span
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
            style={{ backgroundColor: networkTint(network) }}
          >
            <NetworkIcon size={20} style={{ color: networkColor(network) }} />
            <span className="text-lg font-bold" style={{ color: networkColor(network) }}>
              {NETWORK_LABEL[network]}
            </span>
          </span>
        )}
      </div>

      <TopicHeader
        detail={detail}
        ownerEntity={ownerEntity}
        loading={detailLoading}
        error={detailError}
        refetch={refetchDetail}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VolumeOverTimeChart
          entities={topicOwnerEntities}
          points={candidateSeries}
          loading={seriesLoading}
          error={seriesError}
          refetch={refetchSeries}
          period={chartPeriod}
          title="Evolução do tópico"
          subtitle="Menções por dia"
        />
        <SentimentDonut
          sentiment={detail?.sentiment}
          loading={detailLoading}
          error={detailError}
          refetch={refetchDetail}
        />
      </section>

      <SentimentOverTimeChart
        points={sentimentSeries}
        loading={sentimentLoading}
        error={sentimentError}
        refetch={refetchSentiment}
      />

      <TopicExamplePosts
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        refetch={refetchDocuments}
      />
    </>
  )
}
