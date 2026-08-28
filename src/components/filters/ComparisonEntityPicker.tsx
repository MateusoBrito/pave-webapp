import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { Entity } from '../../types'
import { candidateColor } from '../../lib/colors'
import { addCustomEntityIds } from '../../mocks'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { AddCandidateModal } from './AddCandidateModal'

interface SelectorProps {
  tag: 'A' | 'B'
  entity: Entity | undefined
  entities: Entity[]
  onChange: (id: string) => void
}

function EntitySelector({ tag, entity, entities, onChange }: SelectorProps) {
  const color = entity ? candidateColor(entity.id) : 'var(--baseline)'
  return (
    <div
      className={`relative flex w-full max-w-[330px] items-center gap-2.5 rounded-xl border-[1.5px] bg-white py-2.5 pr-3.5 pl-2.5 ${FOCUS_RING}`}
      style={{ borderColor: color }}
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {tag}
      </span>
      {entity && (
        <Avatar name={entity.name} color={color} size={26} photoUrl={entity.photoUrl} />
      )}
      <span className="flex-1 truncate text-[13px] font-bold text-[var(--text-primary)]">
        {entity?.name ?? 'Selecionar candidato'}
      </span>
      <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
      <select
        value={entity?.id ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Candidato ${tag}`}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  )
}

interface Props {
  entities: Entity[]
  aId: string | undefined
  bId: string | undefined
  onChangeA: (id: string) => void
  onChangeB: (id: string) => void
  onEntitiesChanged: () => void
}

/** "Seletor de entidades" do Comparativo — dois candidatos (A/B) + atalho pra
 * registrar um novo, reaproveitando o mesmo AddCandidateModal do filtro global. */
export function ComparisonEntityPicker({
  entities,
  aId,
  bId,
  onChangeA,
  onChangeB,
  onEntitiesChanged,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const entityA = entities.find((e) => e.id === aId)
  const entityB = entities.find((e) => e.id === bId)

  function handleAddCandidates(ids: string[]) {
    addCustomEntityIds(ids)
    onEntitiesChanged()
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <EntitySelector tag="A" entity={entityA} entities={entities} onChange={onChangeA} />
      <span className="text-lg text-[var(--text-muted)]">×</span>
      <EntitySelector tag="B" entity={entityB} entities={entities} onChange={onChangeB} />

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`ml-auto flex items-center gap-2 rounded-xl bg-[var(--tint-primary)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-primary-dark)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
      >
        <Plus size={14} strokeWidth={2.5} />
        Adicionar candidato
      </button>

      <AddCandidateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trackedIds={entities.map((e) => e.id)}
        onConfirm={handleAddCandidates}
      />
    </div>
  )
}
