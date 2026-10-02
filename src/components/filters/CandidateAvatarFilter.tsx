import { useEffect } from 'react'
import { getEntities } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { candidateColor } from '../../lib/colors'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface Props {
  /** true = seleção única (clicar troca em vez de alternar), sempre com exatamente um
   * candidato selecionado - usado em "O que os usuários comentam?", onde o calendário
   * de tópicos só faz sentido pra um candidato por vez (ver TopicsCalendarCard). */
  singleSelect?: boolean
}

export function CandidateAvatarFilter({ singleSelect = false }: Props = {}) {
  const { candidateIds, setCandidateIds } = useFilters()
  const { data: entities = [] } = useAsync(() => getEntities(), [])

  // Seleção única sempre precisa de exatamente um marcado - "vazio" (convenção "todos")
  // não faz sentido aqui, e vir de uma tela com seleção múltipla (Visão Geral) pode
  // chegar aqui com vários. Sem o `length !== 1` (só checava === 0 antes), navegar da
  // Visão Geral com 2+ candidatos marcados pra cá mostrava todos marcados por um
  // instante (o singleSelect não filtrava de volta) até esse efeito rodar - dava a
  // impressão de "mantém a seleção e depois desmarca os outros". Mantém o primeiro já
  // selecionado (em vez de sempre voltar pro primeiro da lista), pra continuar com
  // quem já estava em foco. Escreve de volta no filtro compartilhado (em vez de só
  // exibir localmente) para que outros componentes desta página (ver
  // TopicsCalendarCard) leiam o mesmo candidato que aparece marcado aqui.
  useEffect(() => {
    if (singleSelect && candidateIds.length !== 1 && entities.length) {
      setCandidateIds([candidateIds[0] ?? entities[0].id])
    }
  }, [singleSelect, candidateIds, entities, setCandidateIds])

  function toggle(id: string) {
    if (singleSelect) {
      setCandidateIds([id])
      return
    }
    const allSelected = candidateIds.length === 0
    const base = allSelected ? entities.map((e) => e.id) : candidateIds
    const isSelected = allSelected || candidateIds.includes(id)
    const next = isSelected ? base.filter((v) => v !== id) : [...base, id]
    setCandidateIds(next.length === entities.length ? [] : next)
  }

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Quem queremos acompanhar?
      </p>
      <div className="flex flex-wrap gap-3">
        {entities.map((entity) => {
          const selected = singleSelect
            ? candidateIds.includes(entity.id)
            : candidateIds.length === 0 || candidateIds.includes(entity.id)
          return (
            <button
              key={entity.id}
              type="button"
              title={entity.name}
              onClick={() => toggle(entity.id)}
              className={`flex w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-xl p-1 text-xs ${FOCUS_RING}`}
            >
              <Avatar
                name={entity.name}
                color={candidateColor(entity.id)}
                selected={selected}
                selectionStyle={singleSelect ? 'ring' : 'check'}
                size={44}
                photoUrl={entity.photoUrl}
              />
              <span className="w-full truncate text-center text-[var(--text-secondary)]">
                {shortName(entity.name)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
