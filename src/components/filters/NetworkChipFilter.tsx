import { Check, Megaphone, MessageSquare, Play } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NETWORKS, type Network } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { networkColor, networkTint } from '../../lib/colors'
import { FOCUS_RING } from '../ui/focusRing'

const NETWORK_ICON: Record<Network, LucideIcon> = {
  youtube: Play,
  reddit: MessageSquare,
  meta_ads: Megaphone,
}

/** Rede assumida quando o modo de seleção única ainda não tem nada escolhido — só
 * afeta a exibição do próprio chip (não escreve no filtro global); quem consome os
 * dados nessa tela precisa aplicar o mesmo default (ver ComparisonPage). */
export const DEFAULT_SINGLE_NETWORK: Network = 'reddit'

interface Props {
  /** true = seleção única (clicar troca em vez de alternar) — usado no Comparativo,
   * onde as métricas não somam entre redes */
  singleSelect?: boolean
  title?: string
  /** texto de apoio abaixo dos chips — ex. explicando a seleção única */
  note?: string
  /** restringe quais chips aparecem — ex. só youtube/reddit em "O que os usuários
   * comentam?", onde Meta Ads (conteúdo do candidato, não do público) não se aplica */
  options?: Network[]
}

export function NetworkChipFilter({
  singleSelect = false,
  title = 'Onde está acontecendo?',
  note,
  options = NETWORKS.map((n) => n.id),
}: Props) {
  const { networks, setNetworks } = useFilters()
  const visibleNetworks = NETWORKS.filter((n) => options.includes(n.id))

  function toggle(id: Network) {
    if (singleSelect) {
      setNetworks(networks.length === 1 && networks[0] === id ? [] : [id])
      return
    }
    const allSelected = networks.length === 0
    const base = allSelected ? visibleNetworks.map((n) => n.id) : networks
    const isSelected = allSelected || networks.includes(id)
    const next = isSelected ? base.filter((v) => v !== id) : [...base, id]
    setNetworks(next.length === visibleNetworks.length ? [] : next)
  }

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {visibleNetworks.map((network) => {
          const selected = singleSelect
            ? networks.length > 0
              ? networks.includes(network.id)
              : network.id === DEFAULT_SINGLE_NETWORK
            : networks.length === 0 || networks.includes(network.id)
          const Icon = NETWORK_ICON[network.id]
          return (
            <button
              key={network.id}
              type="button"
              onClick={() => toggle(network.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${FOCUS_RING} ${
                selected
                  ? 'border-transparent'
                  : 'border-[var(--baseline)] text-[var(--text-muted)]'
              }`}
              style={
                selected
                  ? {
                      backgroundColor: networkTint(network.id),
                      color: networkColor(network.id),
                    }
                  : undefined
              }
            >
              <Icon size={15} strokeWidth={2} />
              {network.label}
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      {note && <p className="mt-3 text-[10px] text-[var(--text-muted)]">{note}</p>}
    </div>
  )
}
