import {
  getEmergentTopics,
  getTopicRanking,
  getTopics,
  getTopicsByNetworkMatrix,
  getTopicSeries,
} from '../api/client'
import { EmergentTopicsRow } from '../components/dashboard/EmergentTopicsRow'
import { TopicsByNetworkGrid } from '../components/dashboard/TopicsByNetworkGrid'
import { TopicsRankingList } from '../components/dashboard/TopicsRankingList'
import { TopicsStackedChart } from '../components/dashboard/TopicsStackedChart'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

export function TopicsPage() {
  const { candidateIds, networks, period } = useFilters()
  usePageHeader('Tópicos', `Evolução dos temas no tempo · ${formatDateRange(period)}`)

  const deps = [candidateIds.join(','), period.from, period.to, networks.join(',')]

  const { data: topics = [] } = useAsync(() => getTopics(), [])
  const {
    data: series = [],
    loading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useAsync(() => getTopicSeries({ entityIds: candidateIds, networks, period }), deps)
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
    refetch: refetchRanking,
  } = useAsync(() => getTopicRanking(candidateIds, period, networks), deps)
  const {
    data: matrix = [],
    loading: matrixLoading,
    error: matrixError,
    refetch: refetchMatrix,
  } = useAsync(
    () => getTopicsByNetworkMatrix(candidateIds, period),
    [candidateIds.join(','), period.from, period.to],
  )
  const {
    data: emergent = [],
    loading: emergentLoading,
    error: emergentError,
    refetch: refetchEmergent,
  } = useAsync(() => getEmergentTopics(), [])

  return (
    <>
      <TopicsStackedChart
        topics={topics}
        series={series}
        loading={seriesLoading}
        error={seriesError}
        refetch={refetchSeries}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopicsRankingList
          rows={ranking}
          loading={rankingLoading}
          error={rankingError}
          refetch={refetchRanking}
        />
        <TopicsByNetworkGrid
          rows={matrix}
          loading={matrixLoading}
          error={matrixError}
          refetch={refetchMatrix}
        />
      </section>

      <EmergentTopicsRow
        topics={emergent}
        loading={emergentLoading}
        error={emergentError}
        refetch={refetchEmergent}
      />
    </>
  )
}
