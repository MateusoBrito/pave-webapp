import type { TooltipContentProps } from 'recharts'
import { formatShortDate } from '../../lib/dates'

interface Row {
  key: string
  label: string
  value: number
  color: string
}

/** Values lead, series name follows — line-key stroke instead of a filled swatch box. */
export function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null

  const rows: Row[] = payload
    .filter((entry) => entry.value !== undefined)
    .map((entry) => ({
      key: String(entry.dataKey),
      label: String(entry.name ?? entry.dataKey),
      value: Number(entry.value),
      color: String(entry.color),
    }))

  return (
    <div className="rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-[var(--text-muted)]">
        {formatShortDate(String(label))}
      </p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-0.5 w-3"
              style={{ backgroundColor: row.color }}
            />
            <dd className="font-semibold text-[var(--text-primary)]">
              {row.value.toLocaleString('pt-BR')}
            </dd>
            <dt className="text-[var(--text-secondary)]">{row.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
