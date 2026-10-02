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
import { DualKpiCard } from '../components/dashboard/DualKpiCard'
import { ActiveDateDisplay } from '../components/filters/ActiveDateDisplay'
import { CandidateAvatarFilter } from '../components/filters/CandidateAvatarFilter'
import { MetaPlatformFilter } from '../components/filters/MetaPlatformFilter'
import { KpiCardSkeleton } from '../components/ui/skeletons'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatFullDate, formatShortDate, lastNDaysPeriod } from '../lib/dates'
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

  const totalPeriod = lastNDaysPeriod(366)
  const {
    data: totalSummary,
    loading: totalSummaryLoading,
    error: totalSummaryError,
    refetch: refetchTotalSummary,
  } = useAsync(() => getCandidateContentSummary(candidateIds, totalPeriod, platforms), deps)
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CandidateAvatarFilter singleSelect />
        <MetaPlatformFilter value={platforms} onChange={setPlatforms} />
        <ActiveDateDisplay />
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--tint-blue)] px-4 py-3 text-sm text-[var(--tint-text-blue)]">
        <Megaphone size={16} className="shrink-0 text-[var(--color-blue)]" />
        Aqui o conteúdo é do próprio candidato, não do público: são anúncios pagos declarados na Meta Ad Library. Por isso esta tela não traz análise de sentimento — não há reação pública coletável nos anúncios.
      </div>

      <div className="flex flex-col gap-3">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryLoading || totalSummaryLoading || !summary || !totalSummary ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <DualKpiCard
                icon={Wallet}
                tone="blue"
                label="Investimento declarado"
                totalValue={formatBRLRange(totalSummary.investmentMinBRL, totalSummary.investmentMaxBRL)}
                totalSubtext="a Ad Library publica faixas, não valores exatos"
                dayLabel={`Neste Dia (${formatShortDate(day)})`}
                dayValue={formatBRLRange(summary.investmentMinBRL, summary.investmentMaxBRL)}
              />
              <DualKpiCard
                icon={Megaphone}
                tone="purple"
                label="Anúncios veiculados"
                totalValue={totalSummary.adsCount.toLocaleString('pt-BR')}
                totalSubtext="Total de anúncios lançados na campanha"
                dayLabel={`Neste Dia (${formatShortDate(day)})`}
                dayValue={summary.adsCount.toLocaleString('pt-BR')}
                daySubtext={`${summary.activeAdsCount} ainda ativos no fim do dia`}
              />
              <DualKpiCard
                icon={Eye}
                tone="green"
                label="Impressões estimadas"
                totalValue={`${(totalSummary.impressionsMinTotal / 1_000_000).toFixed(1).replace('.', ',')} mi – ${(totalSummary.impressionsMaxTotal / 1_000_000).toFixed(1).replace('.', ',')} mi`}
                totalSubtext="faixa agregada dos candidatos selecionados"
                dayLabel={`Neste Dia (${formatShortDate(day)})`}
                dayValue={`${(summary.impressionsMinTotal / 1_000_000).toFixed(1).replace('.', ',')} mi – ${(summary.impressionsMaxTotal / 1_000_000).toFixed(1).replace('.', ',')} mi`}
              />
            </>
          )}
        </section>
        {(summaryError || totalSummaryError) && (
          <p className="text-sm text-[var(--color-coral)]">
            Não foi possível carregar os indicadores.{' '}
            <button type="button" onClick={() => { refetchSummary(); refetchTotalSummary(); }} className="underline underline-offset-2">
              Tentar novamente
            </button>
          </p>
        )}
      </div>

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
