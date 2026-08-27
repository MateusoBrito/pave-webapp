import { useParams } from 'react-router-dom'
import {
  getEntities,
  getSentimentSeries,
  getTopicCandidateSeries,
  getTopicDetail,
  getTopicDocuments,
} from '../api/client'
import { ExamplePostsList } from '../components/dashboard/ExamplePostsList'
import { SentimentDonut } from '../components/dashboard/SentimentDonut'
import { SentimentOverTimeChart } from '../components/dashboard/SentimentOverTimeChart'
import { TopicHeader } from '../components/dashboard/TopicHeader'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

export function TopicDrilldownPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const { candidateIds, networks, period } = useFilters()

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const selectedEntities =
    candidateIds.length === 0
      ? entities
      : entities.filter((e) => candidateIds.includes(e.id))

  const deps = [
    topicId,
    candidateIds.join(','),
    period.from,
    period.to,
    networks.join(','),
  ]

  const { data: detail, loading: detailLoading } = useAsync(
    () =>
      topicId
        ? getTopicDetail(topicId, candidateIds, period, networks)
        : Promise.resolve(undefined),
    deps,
  )

  // cada tópico pertence a um candidato só — a legenda mostra só quem fala dele
  const topicOwnerEntities = detail
    ? selectedEntities.filter((e) => e.id === detail.topic.entityId)
    : selectedEntities

  usePageHeader(
    'Drill-down de Tópico',
    `${detail?.topic.label ?? '...'} · ${formatDateRange(period)}`,
  )

  const { data: candidateSeries = [], loading: seriesLoading } = useAsync(
    () =>
      topicId
        ? getTopicCandidateSeries(topicId, candidateIds, period, networks)
        : Promise.resolve([]),
    deps,
  )
  const { data: sentimentSeries = [], loading: sentimentLoading } = useAsync(
    () =>
      topicId
        ? getSentimentSeries(topicId, candidateIds, period, networks)
        : Promise.resolve([]),
    deps,
  )
  const { data: documents = [], loading: documentsLoading } = useAsync(
    () =>
      topicId
        ? getTopicDocuments(topicId, { entityIds: candidateIds, networks })
        : Promise.resolve([]),
    deps,
  )

  return (
    <>
      <TopicHeader detail={detail} loading={detailLoading} />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VolumeOverTimeChart
          entities={topicOwnerEntities}
          points={candidateSeries}
          loading={seriesLoading}
          title="Evolução do tópico"
          subtitle="Menções/dia por candidato · anotações de eventos"
        />
        <SentimentDonut sentiment={detail?.sentiment} loading={detailLoading} />
      </section>

      <SentimentOverTimeChart points={sentimentSeries} loading={sentimentLoading} />

      <ExamplePostsList documents={documents} loading={documentsLoading} />
    </>
  )
}
