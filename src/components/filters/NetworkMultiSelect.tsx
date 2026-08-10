import { NETWORKS, type Network } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { MultiSelectDropdown } from './MultiSelectDropdown'

export function NetworkMultiSelect() {
  const { networks, setNetworks } = useFilters()
  const count = networks.length === 0 ? NETWORKS.length : networks.length

  return (
    <MultiSelectDropdown
      label="Rede social"
      options={NETWORKS.map((n) => ({ id: n.id, label: n.label }))}
      selected={networks}
      onChange={(ids) => setNetworks(ids as Network[])}
      summary={
        networks.length === 0
          ? `Todas (${NETWORKS.length})`
          : `${count} selecionada${count > 1 ? 's' : ''}`
      }
    />
  )
}
