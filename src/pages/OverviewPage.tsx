import {
  getEntities,
  getMentionsByNetwork,
  getOverviewSummary,
  getShareOfVoice,
  getTopicRanking,
  getVolumeOverTime,
} from '../api/client'
import { KpiCard } from '../components/dashboard/KpiCard'
import { MentionsByNetworkChart } from '../components/dashboard/MentionsByNetworkChart'
import { ShareOfVoiceChart } from '../components/dashboard/ShareOfVoiceChart'
import { TopTopicsTable } from '../components/dashboard/TopTopicsTable'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'
import { formatCompactNumber, formatPercent, formatSignedPercent } from '../lib/format'

const SENTIMENT_LABEL: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

export function OverviewPage() {
  const { candidateIds, networks, period } = useFilters()
  usePageHeader(
    'Visão Geral',
    `Panorama da conversa pública · ${formatDateRange(period)}`,
  )

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const selectedEntities =
    candidateIds.length === 0
      ? entities
      : entities.filter((e) => candidateIds.includes(e.id))

  const deps = [candidateIds.join(','), period.from, period.to, networks.join(',')]

  const { data: summary, loading: summaryLoading } = useAsync(
    () => getOverviewSummary(candidateIds, period, networks),
    deps,
  )
  const { data: volume = [], loading: volumeLoading } = useAsync(
    () => getVolumeOverTime(candidateIds, period, networks),
    deps,
  )
  const { data: byNetwork = [], loading: byNetworkLoading } = useAsync(
    () => getMentionsByNetwork(candidateIds, period, networks),
    deps,
  )
  const { data: shareOfVoice = [], loading: shareLoading } = useAsync(
    () => getShareOfVoice(candidateIds, period, networks),
    deps,
  )
  const { data: ranking = [], loading: rankingLoading } = useAsync(
    () => getTopicRanking(candidateIds, period, networks, 10),
    deps,
  )

  const sentimentTotal = summary
    ? summary.sentiment.negative +
        summary.sentiment.neutral +
        summary.sentiment.positive || 1
    : 1

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Menções coletadas"
          value={
            summaryLoading || !summary ? '—' : formatCompactNumber(summary.totalMentions)
          }
          subtext={
            summary
              ? `${formatSignedPercent(summary.deltaPct)} vs. período anterior`
              : undefined
          }
        />
        <KpiCard
          label="Sentimento predominante"
          value={summary ? SENTIMENT_LABEL[summary.predominantSentiment] : '—'}
          subtext={
            summary
              ? `${formatPercent((summary.sentiment.negative / sentimentTotal) * 100)} neg · ${formatPercent(
                  (summary.sentiment.neutral / sentimentTotal) * 100,
                )} neu · ${formatPercent((summary.sentiment.positive / sentimentTotal) * 100)} pos`
              : undefined
          }
        />
        <KpiCard
          label="Tópicos ativos"
          value={summary ? String(summary.activeTopics) : '—'}
          subtext={
            summary ? `${summary.emergentCount} emergentes neste período` : undefined
          }
        />
        <KpiCard
          label="Cobertura da coleta"
          value={summary ? `${summary.daysCovered}/${summary.totalDays} dias` : '—'}
          subtext={
            summary
              ? `${summary.daysCovered === summary.totalDays ? 'sem lacunas' : 'com lacunas'} · ${summary.networksCovered} redes`
              : undefined
          }
        />
      </section>

      <VolumeOverTimeChart
        entities={selectedEntities}
        points={volume}
        loading={volumeLoading}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MentionsByNetworkChart data={byNetwork} loading={byNetworkLoading} />
        <ShareOfVoiceChart
          entities={selectedEntities}
          data={shareOfVoice}
          loading={shareLoading}
        />
      </section>

      <TopTopicsTable rows={ranking} entities={entities} loading={rankingLoading} />
    </>
  )
}
