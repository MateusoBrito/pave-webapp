import { Download, Menu } from 'lucide-react'
import { getCollectionStatus } from '../../api/client'
import { useCurrentPageHeader } from '../../context/PageHeaderContext'
import { useAsync } from '../../hooks'
import { formatFullDate } from '../../lib/dates'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'

interface Props {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: Props) {
  const { title, subtitle } = useCurrentPageHeader()
  const { data: status } = useAsync(() => getCollectionStatus(), [])

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className={`mt-0.5 rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-black/5 lg:hidden ${FOCUS_RING}`}
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--baseline)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
            Última coleta: {formatFullDate(status.lastCollectionDate)} (D-
            {status.daysBehind})
          </span>
        )}
        <Button variant="primary">
          <Download size={16} />
          Exportar
        </Button>
      </div>
    </header>
  )
}
