import { useState } from 'react'
import { Eye, Megaphone, Wallet } from 'lucide-react'
import {
  getAdTopicRanking,
  getCandidateContentSummary,
  getCandidatePosts,
  getEntities,
  getTopics,
} from '../api/client'
import { AdExamplesCarousel } from '../components/dashboard/AdExamplesCarousel'
import { AdsTimelineChart } from '../components/dashboard/AdsTimelineChart'
import { KpiCard } from '../components/dashboard/KpiCard'
import { CandidateAvatarFilter } from '../components/filters/CandidateAvatarFilter'
import { MetaPlatformFilter } from '../components/filters/MetaPlatformFilter'
import { KpiCardSkeleton } from '../components/ui/skeletons'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatFullDate } from '../lib/dates'
import { formatBRLRange } from '../lib/format'
import type { MetaAdPlatform } from '../types'

export function PostsPage() {
  const { candidateIds, day } = useFilters()
  const [platforms, setPlatforms] = useState<MetaAdPlatform[]>([])
  // Um dia só, igual "O que os usuários comentam?" - a modelagem de tópicos de
  // anúncio é diária também (mesmo schema modelo/topico, só fonte_codigo='meta').
  const period = { from: day, to: day }
  usePageHeader(
    'O que os candidatos postam?',
    `Anúncios pagos publicados pelos próprios candidatos, via Meta Ad Library · ${formatFullDate(day)}`,
  )

  const deps = [candidateIds.join(','), period.from, period.to, platforms.join(',')]

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const { data: topics = [] } = useAsync(() => getTopics(), [])

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAsync(() => getCandidateContentSummary(candidateIds, period, platforms), deps)
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
  } = useAsync(() => getAdTopicRanking(candidateIds, period, platforms), deps)
  const {
    data: documents = [],
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(() => getCandidatePosts(candidateIds, period, platforms), deps)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CandidateAvatarFilter singleSelect />
        <MetaPlatformFilter value={platforms} onChange={setPlatforms} />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryLoading || !summary ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              icon={Wallet}
              tone="blue"
              label="Investimento declarado"
              value={formatBRLRange(summary.investmentMinBRL, summary.investmentMaxBRL)}
              subtext="a Ad Library publica faixas, não valores exatos"
            />
            <KpiCard
              icon={Megaphone}
              tone="purple"
              label="Anúncios veiculados"
              value={summary.adsCount.toLocaleString('pt-BR')}
              subtext={`${summary.activeAdsCount} ainda ativos no fim do período`}
            />
            <KpiCard
              icon={Eye}
              tone="green"
              label="Impressões estimadas"
              value={`${(summary.impressionsMinTotal / 1_000_000).toFixed(1).replace('.', ',')} mi – ${(summary.impressionsMaxTotal / 1_000_000).toFixed(1).replace('.', ',')} mi`}
              subtext="faixa agregada dos candidatos selecionados"
            />
          </>
        )}
      </section>

      {summaryError && (
        <p className="text-sm text-[var(--color-coral)]">
          Não foi possível carregar os indicadores.{' '}
          <button
            type="button"
            onClick={refetchSummary}
            className="underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </p>
      )}

      <AdsTimelineChart
        entities={entities}
        rankingRows={ranking}
        rankingLoading={rankingLoading}
        rankingError={rankingError}
      />

      <AdExamplesCarousel
        documents={documents}
        entities={entities}
        topics={topics}
        loading={documentsLoading}
        error={documentsError}
        refetch={refetchDocuments}
      />
    </>
  )
}
