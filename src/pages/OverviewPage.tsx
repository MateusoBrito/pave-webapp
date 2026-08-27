import {
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
const SENTIMENT_VALUE_COLOR: Record<SentimentLabel, string> = {
  negative: 'var(--tint-text-coral)',
  neutral: 'var(--text-primary)',
  positive: 'var(--tint-text-green)',
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
        <KpiCard
          icon={MessageSquare}
          tone="purple"
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
          icon={Calendar}
          tone="green"
          label="Cobertura da coleta"
          value={summary ? `${summary.daysCovered}/${summary.totalDays} dias` : '—'}
          subtext={summary ? `${summary.totalNetworks} plataformas` : undefined}
        />
        <KpiCard
          icon={Thermometer}
          tone={SENTIMENT_TONE[predominant]}
          label="Clima do debate"
          value={summary ? SENTIMENT_LABEL[predominant] : '—'}
          valueColor={summary ? SENTIMENT_VALUE_COLOR[predominant] : undefined}
          subtext={
            sentiment
              ? `${formatPercent((sentiment.negative / sentimentTotal) * 100)} negativo · ${formatPercent(
                  (sentiment.neutral / sentimentTotal) * 100,
                )} neutro · ${formatPercent((sentiment.positive / sentimentTotal) * 100)} positivo`
              : undefined
          }
          subtextSecondary="Soma de Reddit e YouTube · anúncios da Meta não entram"
        />
      </section>

      <VolumeOverTimeChart
        entities={selectedEntities}
        points={volume}
        loading={volumeLoading}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MentionsByNetworkChart
          entities={selectedEntities}
          data={byNetwork}
          loading={byNetworkLoading}
        />
        <ShareOfVoiceChart
          entities={selectedEntities}
          data={shareOfVoice}
          loading={shareLoading}
        />
      </section>

      <TopTopicsTable rows={ranking} entities={entities} loading={rankingLoading} />

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
