import { useState } from 'react'
import { getComparisonSummary, getEntities, getVolumeOverTime } from '../api/client'
import { ComparisonCandidateCard } from '../components/dashboard/ComparisonCandidateCard'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { Button } from '../components/ui/Button'
import { FOCUS_RING } from '../components/ui/focusRing'
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

const SELECT_CLASS = `rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] ${FOCUS_RING}`

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

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
        <PickerBadge value="A" />
        <select
          value={a ?? ''}
          onChange={(e) => setEntityAId(e.target.value)}
          className={SELECT_CLASS}
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
          className={SELECT_CLASS}
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          disabled
          title="Disponível quando novos candidatos entrarem via config (Fase 6)"
          className="ml-auto"
        >
          + Adicionar candidato (vem da API — Fase 6)
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComparisonCandidateCard summary={summaryA} loading={loadingA} />
        <ComparisonCandidateCard summary={summaryB} loading={loadingB} />
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
    </>
  )
}
