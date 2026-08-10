import { getEntities } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { MultiSelectDropdown } from './MultiSelectDropdown'

/** Vem da API — nenhum candidato hardcoded no layout (Fase 6 adiciona mais via config). */
export function CandidateMultiSelect() {
  const { candidateIds, setCandidateIds } = useFilters()
  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const selectedNames =
    candidateIds.length === 0
      ? entities.map((e) => e.name)
      : entities.filter((e) => candidateIds.includes(e.id)).map((e) => e.name)

  return (
    <MultiSelectDropdown
      label="Candidato"
      options={entities.map((e) => ({ id: e.id, label: e.name }))}
      selected={candidateIds}
      onChange={setCandidateIds}
      summary={selectedNames.length > 0 ? selectedNames.join(', ') : 'Nenhum'}
    />
  )
}
