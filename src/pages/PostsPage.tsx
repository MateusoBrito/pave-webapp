import { Eye, Info, Megaphone, Wallet } from 'lucide-react'
import {
  getAdCandidateBreakdown,
  getAdTopicRanking,
  getCandidateContentSummary,
  getCandidatePosts,
  getEntities,
  getTopics,
  getVolumeOverTime,
} from '../api/client'
import { AdCandidateBreakdown } from '../components/dashboard/AdCandidateBreakdown'
import { AdExamplesCarousel } from '../components/dashboard/AdExamplesCarousel'
import { AdTopicRankingList } from '../components/dashboard/AdTopicRankingList'
import { KpiCard } from '../components/dashboard/KpiCard'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { IconTile } from '../components/ui/IconTile'
import { KpiCardSkeleton } from '../components/ui/skeletons'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatBRLRange } from '../lib/format'

export function PostsPage() {
  const { candidateIds, period } = useFilters()
  usePageHeader(
    'O que os candidatos postam?',
    'Anúncios pagos publicados pelos próprios candidatos, via Meta Ad Library',
  )

  const deps = [candidateIds.join(','), period.from, period.to]

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const { data: topics = [] } = useAsync(() => getTopics(), [])
  const selectedEntities =
    candidateIds.length === 0
      ? entities
      : entities.filter((e) => candidateIds.includes(e.id))

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAsync(() => getCandidateContentSummary(candidateIds, period), deps)
  const {
    data: volume = [],
    loading: volumeLoading,
    error: volumeError,
    refetch: refetchVolume,
  } = useAsync(() => getVolumeOverTime(candidateIds, period, ['meta_ads']), deps)
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
    refetch: refetchRanking,
  } = useAsync(() => getAdTopicRanking(candidateIds, period), deps)
  const {
    data: breakdown = [],
    loading: breakdownLoading,
    error: breakdownError,
    refetch: refetchBreakdown,
  } = useAsync(() => getAdCandidateBreakdown(candidateIds, period), deps)
  const {
    data: documents = [],
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(() => getCandidatePosts(candidateIds, period), deps)

  return (
    <>
      <div className="flex items-center gap-[11px] rounded-[14px] border border-[var(--baseline)] bg-[var(--tint-blue)] px-[18px] py-[13px]">
        <IconTile icon={Info} tone="blue" size={30} />
        <p className="flex-1 text-[11px] leading-relaxed text-[var(--tint-text-blue)]">
          Aqui o conteúdo é do próprio candidato, não do público: são anúncios pagos
          declarados na Meta Ad Library. Por isso esta tela não traz análise de sentimento
          — não há reação pública coletável nos anúncios.
        </p>
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

      <VolumeOverTimeChart
        entities={selectedEntities}
        points={volume}
        loading={volumeLoading}
        error={volumeError}
        refetch={refetchVolume}
        period={period}
        icon={Megaphone}
        tone="blue"
        title="Evolução dos anúncios ao longo do tempo"
        subtitle="Volume diário de atividade em anúncios, por candidato"
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdTopicRankingList
          rows={ranking}
          loading={rankingLoading}
          error={rankingError}
          refetch={refetchRanking}
        />
        <AdCandidateBreakdown
          rows={breakdown}
          loading={breakdownLoading}
          error={breakdownError}
          refetch={refetchBreakdown}
        />
      </section>

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
