import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Entity } from '../../types'
import { candidateColor } from '../../lib/colors'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'

interface Props {
  entities: Entity[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

/** Seletor de entidades do Comparativo — um chip removível por candidato selecionado,
 * mais um "+" que já adiciona o próximo direto na comparação (não existe mais um
 * universo de candidatos "sem coleta" pra oferecer aqui: quem aparece em `entities` já
 * é tudo que dá pra comparar). */
export function ComparisonEntityPicker({ entities, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const available = entities.filter((e) => !selectedIds.includes(e.id))

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

  function remove(id: string) {
    onChange(selectedIds.filter((v) => v !== id))
  }

  function add(id: string) {
    onChange([...selectedIds, id])
    setOpen(false)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {selectedIds.map((id) => {
        const entity = entities.find((e) => e.id === id)
        if (!entity) return null
        const color = candidateColor(entity.id)
        return (
          <span
            key={id}
            className="flex items-center gap-2 rounded-xl border-[1.5px] py-2 pr-2 pl-2.5"
            style={{ borderColor: color }}
          >
            <Avatar name={entity.name} color={color} size={26} photoUrl={entity.photoUrl} />
            <span className="max-w-[140px] truncate text-[13px] font-bold text-[var(--text-primary)]">
              {entity.name}
            </span>
            <button
              type="button"
              onClick={() => remove(id)}
              aria-label={`Remover ${entity.name} do comparativo`}
              className={`rounded-md p-1 text-[var(--text-muted)] hover:bg-black/5 ${FOCUS_RING}`}
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          </span>
        )
      })}

      {available.length > 0 && (
        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`flex items-center gap-2 rounded-xl bg-[var(--tint-primary)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-primary-dark)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
          >
            <Plus size={14} strokeWidth={2.5} />
            Adicionar candidato
          </button>

          {open && (
            <div
              role="listbox"
              aria-label="Adicionar candidato ao comparativo"
              className="absolute top-[calc(100%+6px)] left-0 z-20 flex max-h-72 w-[260px] flex-col gap-1 overflow-y-auto rounded-xl bg-white p-1.5"
              style={{ boxShadow: 'var(--modal-shadow)' }}
            >
              {available.map((e) => {
                const color = candidateColor(e.id)
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="option"
                    onClick={() => add(e.id)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-black/[0.03] ${FOCUS_RING}`}
                  >
                    <Avatar name={e.name} color={color} size={28} photoUrl={e.photoUrl} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      {e.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
