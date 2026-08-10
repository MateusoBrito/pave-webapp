import { useState } from 'react'
import {
  getComparisonSummary,
  getDivergingTopics,
  getEntities,
  getVolumeOverTime,
} from '../api/client'
import { ComparisonCandidateCard } from '../components/dashboard/ComparisonCandidateCard'
import { DivergingTopicsChart } from '../components/dashboard/DivergingTopicsChart'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

function PickerBadge({ value }: { value: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--baseline)] text-xs font-medium text-[var(--text-secondary)]">
      {value}
    </span>
  )
}

export function ComparisonPage() {
  const { networks, period } = useFilters()
  const { data: entities = [] } = useAsync(() => getEntities(), [])

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

  const deps = [a, b, period.from, period.to, networks.join(',')]

  const { data: summaryA, loading: loadingA } = useAsync(
    () => (a ? getComparisonSummary(a, period, networks) : Promise.resolve(undefined)),
    deps,
  )
  const { data: summaryB, loading: loadingB } = useAsync(
    () => (b ? getComparisonSummary(b, period, networks) : Promise.resolve(undefined)),
    deps,
  )
  const { data: volume = [], loading: volumeLoading } = useAsync(
    () => (a && b ? getVolumeOverTime([a, b], period, networks) : Promise.resolve([])),
    deps,
  )
  const { data: diverging = [], loading: divergingLoading } = useAsync(
    () => (a && b ? getDivergingTopics(a, b, period, networks) : Promise.resolve([])),
    deps,
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
        <PickerBadge value="A" />
        <select
          value={a ?? ''}
          onChange={(e) => setEntityAId(e.target.value)}
          className="rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <span className="text-[var(--text-muted)]">×</span>

        <PickerBadge value="B" />
        <select
          value={b ?? ''}
          onChange={(e) => setEntityBId(e.target.value)}
          className="rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled
          title="Disponível quando novos candidatos entrarem via config (Fase 6)"
          className="ml-auto cursor-not-allowed rounded-lg border border-[var(--baseline)] px-3 py-1.5 text-sm text-[var(--text-muted)]"
        >
          + Adicionar candidato (vem da API — Fase 6)
        </button>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComparisonCandidateCard summary={summaryA} loading={loadingA} colorIndex={0} />
        <ComparisonCandidateCard summary={summaryB} loading={loadingB} colorIndex={1} />
      </section>

      <VolumeOverTimeChart
        entities={[entityA, entityB].filter((e): e is NonNullable<typeof e> =>
          Boolean(e),
        )}
        points={volume}
        loading={volumeLoading}
        title="Volume comparado ao longo do tempo"
        subtitle="Série diária · mesma escala para os dois candidatos"
      />

      <DivergingTopicsChart
        rows={diverging}
        loading={divergingLoading}
        labelA={entityA?.name ?? 'A'}
        labelB={entityB?.name ?? 'B'}
      />
    </>
  )
}
