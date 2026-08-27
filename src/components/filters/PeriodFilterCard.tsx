import { Calendar } from 'lucide-react'
import { useFilters } from '../../context/FiltersContext'
import { formatDateRange } from '../../lib/dates'
import { SegmentedControl } from '../ui/SegmentedControl'

const PRESETS = [7, 30, 90]

export function PeriodFilterCard() {
  const { period, days, setDays } = useFilters()

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Quando queremos analisar?
      </p>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--baseline)] px-3 py-2 text-sm text-[var(--text-primary)]">
        <Calendar size={16} className="shrink-0 text-[var(--text-muted)]" />
        {formatDateRange(period)}
      </div>
      <SegmentedControl
        options={PRESETS.map((preset) => ({
          value: String(preset),
          label: `${preset} dias`,
        }))}
        value={String(days)}
        onChange={(value) => setDays(Number(value))}
      />
    </div>
  )
}
