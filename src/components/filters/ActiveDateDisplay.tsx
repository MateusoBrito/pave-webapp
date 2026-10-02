import { CalendarDays } from 'lucide-react'
import { useFilters } from '../../context/FiltersContext'
import { formatFullDate } from '../../lib/dates'

export function ActiveDateDisplay() {
  const { day } = useFilters()

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Data em análise
      </p>
      <div className="flex items-center gap-3 h-[42px] px-3 rounded-xl bg-black/5 text-[var(--text-primary)] font-medium">
        <CalendarDays size={18} className="text-[var(--text-secondary)]" />
        <span>{formatFullDate(day)}</span>
      </div>
    </div>
  )
}

