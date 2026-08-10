import { useFilters } from '../../context/FiltersContext'
import { formatDateRange } from '../../lib/dates'
import { CandidateMultiSelect } from './CandidateMultiSelect'
import { NetworkMultiSelect } from './NetworkMultiSelect'
import { TopicSelect } from './TopicSelect'

const PRESETS = [7, 30, 90]

/** Filtros globais e persistentes — mesma barra em todas as telas, refletidos na URL. */
export function FilterBar() {
  const { period, days, setDays, clearFilters } = useFilters()

  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-[var(--baseline)] px-6 py-3">
      <CandidateMultiSelect />

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Período
        </label>
        <div className="min-w-[170px] rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
          {formatDateRange(period)}
        </div>
      </div>

      <NetworkMultiSelect />
      <TopicSelect />

      <div className="flex items-center gap-1 pb-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDays(preset)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              days === preset
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--chart-surface)]'
                : 'border-[var(--baseline)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {preset}d
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="ml-auto pb-2 text-sm text-[var(--text-secondary)] underline-offset-2 hover:underline"
      >
        Limpar filtros
      </button>
    </div>
  )
}
