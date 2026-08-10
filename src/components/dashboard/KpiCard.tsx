interface Props {
  label: string
  value: string
  subtext?: string
}

export function KpiCard({ label, value, subtext }: Props) {
  return (
    <div className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      {subtext && <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtext}</p>}
    </div>
  )
}
