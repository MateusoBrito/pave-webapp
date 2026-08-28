import { useState } from 'react'
import { Clock, Download, Menu } from 'lucide-react'
import { useMatch } from 'react-router-dom'
import { getCollectionStatus } from '../../api/client'
import { useCurrentPageHeader } from '../../context/PageHeaderContext'
import { useAsync } from '../../hooks'
import { formatFullDate } from '../../lib/dates'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { ExportModal } from './ExportModal'

interface Props {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: Props) {
  const { title, subtitle } = useCurrentPageHeader()
  const { data: status } = useAsync(() => getCollectionStatus(), [])
  const isMethodology = useMatch('/metodologia')
  const [exportOpen, setExportOpen] = useState(false)

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
        {isMethodology ? (
          <>
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--baseline)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:flex">
              <Clock size={13} className="shrink-0 text-[var(--text-muted)]" />
              Modelo de tópicos v7 · re-modelado em 01/07/2026
            </span>
            <Button variant="primary" disabled title="Exportação em PDF ainda não existe">
              <Download size={16} />
              Baixar em PDF
            </Button>
          </>
        ) : (
          <>
            {status && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--baseline)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
                Última coleta: {formatFullDate(status.lastCollectionDate)} (D-
                {status.daysBehind})
              </span>
            )}
            <Button variant="primary" onClick={() => setExportOpen(true)}>
              <Download size={16} />
              Exportar
            </Button>
          </>
        )}
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        pageTitle={title}
      />
    </header>
  )
}
