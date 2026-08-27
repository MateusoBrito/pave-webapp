import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  MessageSquare,
  Thermometer,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  getEntities,
  getHighlights,
  getMentionsByNetwork,
  getOverviewSummary,
  getShareOfVoice,
  getTopicRanking,
  getVolumeOverTime,
} from '../api/client'
import { HighlightCard } from '../components/dashboard/HighlightCard'
import { KpiCard } from '../components/dashboard/KpiCard'
import { MentionsByNetworkChart } from '../components/dashboard/MentionsByNetworkChart'
import { ShareOfVoiceChart } from '../components/dashboard/ShareOfVoiceChart'
import { TopTopicsTable } from '../components/dashboard/TopTopicsTable'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import type { IconTone } from '../components/ui/IconTile'
import { KpiCardSkeleton } from '../components/ui/skeletons'
import { StatusCard } from '../components/ui/StatusCard'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import type { SentimentLabel } from '../types'
import { formatDateRange } from '../lib/dates'
import { formatCompactNumber, formatPercent, formatSignedPercent } from '../lib/format'

const SENTIMENT_LABEL: Record<SentimentLabel, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}
const SENTIMENT_TONE: Record<SentimentLabel, IconTone> = {
  negative: 'coral',
  neutral: 'graphite',
  positive: 'green',
}
const HIGHLIGHT_STYLE: Record<string, { icon: LucideIcon; tone: IconTone }> = {
  top_topic: { icon: TrendingUp, tone: 'purple' },
  network_growth: { icon: ArrowUpRight, tone: 'green' },
}

export function OverviewPage() {
  const { candidateIds, networks, period } = useFilters()
  usePageHeader(
    'Visão Geral',
    `O que está movimentando a conversa eleitoral? · ${formatDateRange(period)}`,
  )

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const selectedEntities =
    candidateIds.length === 0
      ? entities
      : entities.filter((e) => candidateIds.includes(e.id))

  const deps = [candidateIds.join(','), period.from, period.to, networks.join(',')]

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAsync(() => getOverviewSummary(candidateIds, period, networks), deps)
  const {
    data: volume = [],
    loading: volumeLoading,
    error: volumeError,
    refetch: refetchVolume,
  } = useAsync(() => getVolumeOverTime(candidateIds, period, networks), deps)
  const {
    data: byNetwork = [],
    loading: byNetworkLoading,
    error: byNetworkError,
    refetch: refetchByNetwork,
  } = useAsync(() => getMentionsByNetwork(candidateIds, period, networks), deps)
  const {
    data: shareOfVoice = [],
    loading: shareLoading,
    error: shareError,
    refetch: refetchShare,
  } = useAsync(() => getShareOfVoice(candidateIds, period, networks), deps)
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
    refetch: refetchRanking,
  } = useAsync(() => getTopicRanking(candidateIds, period, networks, 10), deps)
  const { data: highlights = [] } = useAsync(
    () => getHighlights(candidateIds, period, networks),
    deps,
  )

  const sentiment = summary?.organicSentiment
  const sentimentTotal = sentiment
    ? sentiment.negative + sentiment.neutral + sentiment.positive || 1
    : 1
  const predominant = summary?.predominantSentiment ?? 'neutral'

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryError ? (
          <div className="sm:col-span-3">
            <StatusCard
              icon={AlertTriangle}
              tone="coral"
              title="Não foi possível carregar"
              description="Falha ao consultar a API. Seus filtros foram mantidos — é só tentar de novo."
              primaryAction={{ label: 'Tentar novamente', onClick: refetchSummary }}
              secondaryAction={{
                label: `Copiar código do erro · ${summaryError.message || '500'}`,
                onClick: () =>
                  navigator.clipboard?.writeText(summaryError.message || '500'),
              }}
            />
          </div>
        ) : summaryLoading || !summary ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              icon={MessageSquare}
              tone="purple"
              label="Menções coletadas"
              value={formatCompactNumber(summary.totalMentions)}
              subtext={`${formatSignedPercent(summary.deltaPct)} vs. período anterior`}
              subtextColor={
                summary.deltaPct >= 0
                  ? 'var(--tint-text-green)'
                  : 'var(--tint-text-coral)'
              }
            />
            <KpiCard
              icon={Calendar}
              tone="green"
              label="Cobertura da coleta"
              value={`${summary.daysCovered}/${summary.totalDays} dias`}
              subtext={`${summary.totalNetworks} plataformas`}
            />
            <KpiCard
              icon={Thermometer}
              tone={SENTIMENT_TONE[predominant]}
              label="Clima do debate"
              value={SENTIMENT_LABEL[predominant]}
              subtext={
                sentiment
                  ? `${formatPercent((sentiment.negative / sentimentTotal) * 100)} negativo · ${formatPercent(
                      (sentiment.neutral / sentimentTotal) * 100,
                    )} neutro · ${formatPercent((sentiment.positive / sentimentTotal) * 100)} positivo`
                  : undefined
              }
              subtextSecondary="Soma de Reddit e YouTube · anúncios da Meta não entram"
            />
          </>
        )}
      </section>

      <VolumeOverTimeChart
        entities={selectedEntities}
        points={volume}
        loading={volumeLoading}
        error={volumeError}
        refetch={refetchVolume}
        period={period}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MentionsByNetworkChart
          entities={selectedEntities}
          data={byNetwork}
          loading={byNetworkLoading}
          error={byNetworkError}
          refetch={refetchByNetwork}
        />
        <ShareOfVoiceChart
          entities={selectedEntities}
          data={shareOfVoice}
          loading={shareLoading}
          error={shareError}
          refetch={refetchShare}
        />
      </section>

      <TopTopicsTable
        rows={ranking}
        entities={entities}
        loading={rankingLoading}
        error={rankingError}
        refetch={refetchRanking}
      />

      {highlights.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {highlights.map((h) => {
            const style = HIGHLIGHT_STYLE[h.kind]
            return (
              <HighlightCard
                key={h.kind}
                icon={style.icon}
                tone={style.tone}
                title={h.title}
                description={h.description}
              />
            )
          })}
        </section>
      )}
    </>
  )
}
