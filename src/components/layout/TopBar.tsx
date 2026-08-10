import { getCollectionStatus } from '../../api/client'
import { useCurrentPageHeader } from '../../context/PageHeaderContext'
import { useAsync } from '../../hooks'
import { formatFullDate } from '../../lib/dates'

export function TopBar() {
  const { title, subtitle } = useCurrentPageHeader()
  const { data: status } = useAsync(() => getCollectionStatus(), [])

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--baseline)] px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--baseline)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]" />
            Última coleta: {formatFullDate(status.lastCollectionDate)} (D-
            {status.daysBehind})
          </span>
        )}
        <button
          type="button"
          className="rounded-lg border border-[var(--baseline)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
        >
          Exportar
        </button>
      </div>
    </header>
  )
}
