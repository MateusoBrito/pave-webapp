import { useState } from 'react'
import {
  getComparisonSummary,
  getEntities,
  getNegativeSentimentOverTime,
  getVolumeOverTime,
} from '../api/client'
import { ComparisonPanel } from '../components/dashboard/ComparisonPanel'
import { NegativeSentimentOverTimeChart } from '../components/dashboard/NegativeSentimentOverTimeChart'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { ComparisonEntityPicker } from '../components/filters/ComparisonEntityPicker'
import {
  DEFAULT_SINGLE_NETWORK,
  NetworkChipFilter,
} from '../components/filters/NetworkChipFilter'
import { PeriodFilterCard } from '../components/filters/PeriodFilterCard'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

export function ComparisonPage() {
  const { networks, period } = useFilters()
  // filtro de rede aqui é seleção única (ver NetworkChipFilter singleSelect) — quando
  // nada foi escolhido ainda, usa o mesmo default que o chip mostra visualmente, sem
  // gravar no filtro global (evita afetar o que outras telas veem)
  const effectiveNetworks = networks.length > 0 ? networks : [DEFAULT_SINGLE_NETWORK]
  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const [selectedIds, setSelectedIds] = useState<string[]>()
  // sem seleção do usuário ainda, começa com os 2 primeiros — depois disso quem manda é
  // só o que está em selectedIds (inclusive vazio, se o usuário remover tudo)
  const ids = (selectedIds ?? entities.slice(0, 2).map((e) => e.id)).filter((id) =>
    entities.some((e) => e.id === id),
  )
  const selectedEntities = ids
    .map((id) => entities.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))

  usePageHeader(
    'Comparativo',
    selectedEntities.length > 0
      ? `${selectedEntities.map((e) => e.name).join(' × ')} · ${formatDateRange(period)}`
      : formatDateRange(period),
  )

  const deps = [ids.join(','), period.from, period.to, effectiveNetworks.join(',')]

  const {
    data: summaries,
    loading: summariesLoading,
    error: summariesError,
    refetch: refetchSummaries,
  } = useAsync(
    () => Promise.all(ids.map((id) => getComparisonSummary(id, period, effectiveNetworks))),
    deps,
  )
  const {
    data: volume = [],
    loading: volumeLoading,
    error: volumeError,
    refetch: refetchVolume,
  } = useAsync(
    () =>
      ids.length > 0
        ? getVolumeOverTime(ids, period, effectiveNetworks)
        : Promise.resolve([]),
    deps,
  )
  const {
    data: negativeSentiment = [],
    loading: negativeSentimentLoading,
    error: negativeSentimentError,
    refetch: refetchNegativeSentiment,
  } = useAsync(
    () =>
      ids.length > 0
        ? getNegativeSentimentOverTime(ids, period, effectiveNetworks)
        : Promise.resolve([]),
    deps,
  )

  const totalMentions =
    (summaries ?? []).reduce((sum, s) => sum + (s?.mentions ?? 0), 0) || 1

  return (
    <>
      <ComparisonEntityPicker entities={entities} selectedIds={ids} onChange={setSelectedIds} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PeriodFilterCard />
        <NetworkChipFilter
          singleSelect
          title="Em qual rede?"
          note="Uma rede por vez — as métricas não somam entre redes. Em Meta Ads não há sentimento."
        />
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ids.map((id, i) => (
          <ComparisonPanel
            key={id}
            tag={String.fromCharCode(65 + i)}
            summary={summaries?.[i]}
            sharePct={((summaries?.[i]?.mentions ?? 0) / totalMentions) * 100}
            loading={summariesLoading}
            error={summariesError}
            refetch={refetchSummaries}
            network={effectiveNetworks[0]}
            period={period}
          />
        ))}
      </section>

      <VolumeOverTimeChart
        entities={selectedEntities}
        points={volume}
        loading={volumeLoading}
        error={volumeError}
        refetch={refetchVolume}
        period={period}
        title="Volume comparado ao longo do tempo"
        subtitle="Menções por dia, na mesma escala entre os candidatos"
      />

      <NegativeSentimentOverTimeChart
        entities={selectedEntities}
        points={negativeSentiment}
        loading={negativeSentimentLoading}
        error={negativeSentimentError}
        refetch={refetchNegativeSentiment}
      />
    </>
  )
}
