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
import { DEFAULT_SINGLE_NETWORK } from '../components/filters/NetworkChipFilter'
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
  const { data: entities = [], refetch: refetchEntities } = useAsync(
    () => getEntities(),
    [],
  )

  const [entityAId, setEntityAId] = useState<string>()
  const [entityBId, setEntityBId] = useState<string>()

  const a = entityAId ?? entities[0]?.id
  const b = entityBId ?? entities[1]?.id
  const entityA = entities.find((e) => e.id === a)
  const entityB = entities.find((e) => e.id === b)

  usePageHeader(
    'Comparativo',
    entityA && entityB
      ? `${entityA.name} × ${entityB.name} · ${formatDateRange(period)}`
      : formatDateRange(period),
  )

  const deps = [a, b, period.from, period.to, effectiveNetworks.join(',')]

  const {
    data: summaryA,
    loading: loadingA,
    error: errorA,
    refetch: refetchA,
  } = useAsync(
    () =>
      a ? getComparisonSummary(a, period, effectiveNetworks) : Promise.resolve(undefined),
    deps,
  )
  const {
    data: summaryB,
    loading: loadingB,
    error: errorB,
    refetch: refetchB,
  } = useAsync(
    () =>
      b ? getComparisonSummary(b, period, effectiveNetworks) : Promise.resolve(undefined),
    deps,
  )
  const {
    data: volume = [],
    loading: volumeLoading,
    error: volumeError,
    refetch: refetchVolume,
  } = useAsync(
    () =>
      a && b ? getVolumeOverTime([a, b], period, effectiveNetworks) : Promise.resolve([]),
    deps,
  )
  const {
    data: negativeSentiment = [],
    loading: negativeSentimentLoading,
    error: negativeSentimentError,
    refetch: refetchNegativeSentiment,
  } = useAsync(
    () =>
      a && b
        ? getNegativeSentimentOverTime([a, b], period, effectiveNetworks)
        : Promise.resolve([]),
    deps,
  )

  const pairEntities = [entityA, entityB].filter((e): e is NonNullable<typeof e> =>
    Boolean(e),
  )
  const totalMentions = (summaryA?.mentions ?? 0) + (summaryB?.mentions ?? 0) || 1
  const sharePctA = ((summaryA?.mentions ?? 0) / totalMentions) * 100
  const sharePctB = ((summaryB?.mentions ?? 0) / totalMentions) * 100

  return (
    <>
      <ComparisonEntityPicker
        entities={entities}
        aId={a}
        bId={b}
        onChangeA={setEntityAId}
        onChangeB={setEntityBId}
        onEntitiesChanged={refetchEntities}
      />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ComparisonPanel
          tag="A"
          summary={summaryA}
          sharePct={sharePctA}
          loading={loadingA}
          error={errorA}
          refetch={refetchA}
        />
        <ComparisonPanel
          tag="B"
          summary={summaryB}
          sharePct={sharePctB}
          loading={loadingB}
          error={errorB}
          refetch={refetchB}
        />
      </section>

      <VolumeOverTimeChart
        entities={pairEntities}
        points={volume}
        loading={volumeLoading}
        error={volumeError}
        refetch={refetchVolume}
        period={period}
        title="Volume comparado ao longo do tempo"
        subtitle="Menções por dia, na mesma escala para os dois candidatos"
      />

      <NegativeSentimentOverTimeChart
        entities={pairEntities}
        points={negativeSentiment}
        loading={negativeSentimentLoading}
        error={negativeSentimentError}
        refetch={refetchNegativeSentiment}
      />
    </>
  )
}
