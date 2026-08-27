import { useFilters } from '../../context/FiltersContext'
import { FOCUS_RING } from '../ui/focusRing'
import { CandidateAvatarFilter } from './CandidateAvatarFilter'
import { NetworkChipFilter } from './NetworkChipFilter'
import { PeriodFilterCard } from './PeriodFilterCard'

/** Filtros globais e persistentes — mesma barra em todas as telas, refletidos na URL. */
export function FilterBar() {
  const { clearFilters } = useFilters()

  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CandidateAvatarFilter />
        <PeriodFilterCard />
        <NetworkChipFilter />
      </div>
      <button
        type="button"
        onClick={clearFilters}
        className={`self-end rounded-lg px-1 text-sm text-[var(--color-primary-dark)] underline-offset-2 hover:underline ${FOCUS_RING}`}
      >
        Limpar filtros
      </button>
    </div>
  )
}
