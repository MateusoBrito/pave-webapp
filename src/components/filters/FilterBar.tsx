import { CandidateAvatarFilter } from './CandidateAvatarFilter'
import { NetworkChipFilter } from './NetworkChipFilter'
import { PeriodFilterCard } from './PeriodFilterCard'

/** Filtros globais e persistentes — mesma barra em todas as telas, refletidos na URL. */
export function FilterBar() {
  return (
    <div className="px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CandidateAvatarFilter />
        <PeriodFilterCard />
        <NetworkChipFilter />
      </div>
    </div>
  )
}
