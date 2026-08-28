import { useParams } from 'react-router-dom'
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
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

// O tópico já nasce associado a um candidato (ver FilterBar) — o filtro de candidato
// do resto do app não se aplica aqui, só o período. Rede sempre fica restrita às
// orgânicas (YouTube/Reddit): Meta Ads é conteúdo pago do próprio candidato, não
// conversa do público — mesma regra já usada em getTopicRanking/getOverviewSummary.
const NO_ENTITY_RESTRICTION: string[] = []

export function TopicDrilldownPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const { period } = useFilters()

  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const deps = [topicId, period.from, period.to]

  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useAsync(
    () =>
      topicId
        ? getTopicDetail(topicId, NO_ENTITY_RESTRICTION, period, ORGANIC_NETWORKS)
        : Promise.resolve(undefined),
    deps,
  )

  // cada tópico pertence a um candidato só
  const ownerEntity = detail
    ? entities.find((e) => e.id === detail.topic.entityId)
    : undefined
  const topicOwnerEntities = ownerEntity ? [ownerEntity] : []

  usePageHeader(
    'Drill-down de Tópico',
    `${detail?.topic.label ?? '...'} · ${formatDateRange(period)}`,
  )

  const {
    data: candidateSeries = [],
    loading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useAsync(
    () =>
      topicId
        ? getTopicCandidateSeries(
            topicId,
            NO_ENTITY_RESTRICTION,
            period,
            ORGANIC_NETWORKS,
          )
        : Promise.resolve([]),
    deps,
  )
  const {
    data: sentimentSeries = [],
    loading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment,
  } = useAsync(
    () =>
      topicId
        ? getSentimentSeries(topicId, NO_ENTITY_RESTRICTION, period, ORGANIC_NETWORKS)
        : Promise.resolve([]),
    deps,
  )
  const {
    data: documents = [],
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(
    () =>
      topicId
        ? getTopicDocuments(topicId, {
            entityIds: NO_ENTITY_RESTRICTION,
            networks: ORGANIC_NETWORKS,
          })
        : Promise.resolve([]),
    deps,
  )

  return (
    <>
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
          period={period}
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
