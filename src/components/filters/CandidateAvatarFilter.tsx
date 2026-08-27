import { useState } from 'react'
import { User } from 'lucide-react'
import { getEntities } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { candidateColor } from '../../lib/colors'
import { addCustomEntityIds } from '../../mocks'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { AddCandidateModal } from './AddCandidateModal'

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function CandidateAvatarFilter() {
  const { candidateIds, setCandidateIds } = useFilters()
  const { data: entities = [], refetch } = useAsync(() => getEntities(), [])
  const [modalOpen, setModalOpen] = useState(false)

  function handleAddCandidates(ids: string[]) {
    addCustomEntityIds(ids)
    refetch()
  }

  function toggle(id: string) {
    const allSelected = candidateIds.length === 0
    const base = allSelected ? entities.map((e) => e.id) : candidateIds
    const isSelected = allSelected || candidateIds.includes(id)
    const next = isSelected ? base.filter((v) => v !== id) : [...base, id]
    setCandidateIds(next.length === entities.length ? [] : next)
  }

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Quem queremos acompanhar?
      </p>
      <div className="flex gap-4">
        {entities.map((entity) => {
          const selected = candidateIds.length === 0 || candidateIds.includes(entity.id)
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => toggle(entity.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 text-xs ${FOCUS_RING}`}
            >
              <Avatar
                name={entity.name}
                color={candidateColor(entity.id)}
                selected={selected}
                size={44}
                photoUrl={entity.photoUrl}
              />
              <span className="text-[var(--text-secondary)]">
                {shortName(entity.name)}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`flex flex-col items-center gap-1.5 rounded-xl p-1 text-xs ${FOCUS_RING}`}
        >
          <Avatar name="Outros" color="" muted icon={User} size={44} />
          <span className="text-[var(--text-muted)]">Outros</span>
        </button>
      </div>
      <AddCandidateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trackedIds={entities.map((e) => e.id)}
        onConfirm={handleAddCandidates}
      />
    </div>
  )
}
