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

export function NetworkChipFilter() {
  const { networks, setNetworks } = useFilters()

  function toggle(id: Network) {
    const allSelected = networks.length === 0
    const base = allSelected ? NETWORKS.map((n) => n.id) : networks
    const isSelected = allSelected || networks.includes(id)
    const next = isSelected ? base.filter((v) => v !== id) : [...base, id]
    setNetworks(next.length === NETWORKS.length ? [] : next)
  }

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Onde está acontecendo?
      </p>
      <div className="flex flex-wrap gap-2">
        {NETWORKS.map((network) => {
          const selected = networks.length === 0 || networks.includes(network.id)
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
    </div>
  )
}
