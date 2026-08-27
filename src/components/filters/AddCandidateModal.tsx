import { useMemo, useState } from 'react'
import { Check, Plus, Search, User, X } from 'lucide-react'
import { CANDIDATE_REGISTRY } from '../../mocks/candidateRegistry'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile } from '../ui/IconTile'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  /** ids já monitorados hoje — ficam com o rótulo "Já monitorado", não podem ser adicionados de novo */
  trackedIds: string[]
  onConfirm: (ids: string[]) => void
}

/** Modal "Adicionar candidato" — busca no registro de entidades cadastradas e permite
 * marcar uma ou mais para entrar no acompanhamento (filtro global + comparativo). */
export function AddCandidateModal({ open, onClose, trackedIds, onConfirm }: Props) {
  const [query, setQuery] = useState('')
  const [staged, setStaged] = useState<string[]>([])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CANDIDATE_REGISTRY
    return CANDIDATE_REGISTRY.filter((c) => c.name.toLowerCase().includes(q))
  }, [query])

  function reset() {
    setQuery('')
    setStaged([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleStaged(id: string) {
    setStaged((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    )
  }

  function handleConfirm() {
    if (staged.length > 0) onConfirm(staged)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} ariaLabel="Adicionar candidato">
      <div className="flex w-full items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Adicionar candidato
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Escolha uma entidade já cadastrada no registro. É o registro que define os
            apelidos e termos de busca usados na coleta.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className={`shrink-0 rounded-lg bg-[var(--gridline)] p-2 text-[var(--text-secondary)] hover:bg-black/10 ${FOCUS_RING}`}
        >
          <X size={16} />
        </button>
      </div>

      <label className="flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--color-primary)] px-4 py-3">
        <Search size={18} className="shrink-0 text-[var(--color-primary)]" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome"
          className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </label>

      <div className="flex w-full flex-col gap-3">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            Nenhuma entidade encontrada.
          </p>
        ) : (
          results.map((candidate) => {
            const monitored = trackedIds.includes(candidate.id)
            const isStaged = staged.includes(candidate.id)
            return (
              <div
                key={candidate.id}
                className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
                  monitored
                    ? 'border-[var(--gridline)] bg-[var(--page-plane)]'
                    : 'border-[var(--baseline)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconTile
                    icon={User}
                    tone={monitored ? 'graphite' : 'purple'}
                    size={44}
                  />
                  <div>
                    <p
                      className={`font-semibold ${monitored ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
                    >
                      {candidate.name}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {candidate.apelidos} apelidos · {candidate.termos} termos de busca
                    </p>
                  </div>
                </div>
                {monitored ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--tint-graphite)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)]">
                    <Check size={16} strokeWidth={2.5} />
                    Já monitorado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleStaged(candidate.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS_RING} ${
                      isStaged
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--tint-primary)] text-[var(--color-primary-dark)] hover:brightness-95'
                    }`}
                  >
                    {isStaged ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : (
                      <Plus size={16} strokeWidth={2.5} />
                    )}
                    {isStaged ? 'Adicionado' : 'Adicionar'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex w-full items-center justify-end gap-3">
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={staged.length === 0}>
          Adicionar ao comparativo
        </Button>
      </div>
    </Modal>
  )
}
