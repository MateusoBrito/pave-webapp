import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import type { Entity } from '../../types'
import { candidateColor } from '../../lib/colors'
import { addTrackedEntityIds, removeTrackedEntityId } from '../../lib/trackedEntities'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { AddCandidateModal } from './AddCandidateModal'

interface SelectorProps {
  tag: 'A' | 'B'
  entity: Entity | undefined
  entities: Entity[]
  onChange: (id: string) => void
}

/** Combobox custom (não um `<select>` nativo) pra poder mostrar foto/cor de cada
 * candidato na lista — um `<option>` nativo não aceita HTML rico. */
function EntitySelector({ tag, entity, entities, onChange }: SelectorProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const color = entity ? candidateColor(entity.id) : 'var(--baseline)'

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative w-full max-w-[330px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Candidato ${tag}`}
        className={`flex w-full items-center gap-2.5 rounded-xl border-[1.5px] bg-white py-2.5 pr-3.5 pl-2.5 transition-colors ${FOCUS_RING}`}
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
        <span className="flex-1 truncate text-left text-[13px] font-bold text-[var(--text-primary)]">
          {entity?.name ?? 'Selecionar candidato'}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`Escolher candidato ${tag}`}
          className="absolute top-[calc(100%+6px)] left-0 z-20 flex max-h-72 w-full min-w-[260px] flex-col gap-1 overflow-y-auto rounded-xl bg-white p-1.5"
          style={{ boxShadow: 'var(--modal-shadow)' }}
        >
          {entities.map((e) => {
            const optionColor = candidateColor(e.id)
            const selected = e.id === entity?.id
            return (
              <button
                key={e.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(e.id)
                  setOpen(false)
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${FOCUS_RING} ${
                  selected ? 'bg-[var(--tint-primary)]' : 'hover:bg-black/[0.03]'
                }`}
              >
                <Avatar
                  name={e.name}
                  color={optionColor}
                  size={28}
                  photoUrl={e.photoUrl}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  {e.name}
                </span>
                {selected && (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className="shrink-0 text-[var(--color-primary)]"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
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
    addTrackedEntityIds(ids)
    onEntitiesChanged()
  }

  function handleRemoveCandidate(id: string) {
    removeTrackedEntityId(id)
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
        onRemove={handleRemoveCandidate}
      />
    </div>
  )
}
