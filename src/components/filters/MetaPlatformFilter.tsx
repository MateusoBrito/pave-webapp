import { AtSign, Camera, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MetaAdPlatform } from '../../types'
import { FOCUS_RING } from '../ui/focusRing'

const PLATFORMS: { id: MetaAdPlatform; label: string; icon: LucideIcon }[] = [
  { id: 'facebook', label: 'Facebook', icon: AtSign },
  { id: 'instagram', label: 'Instagram', icon: Camera },
]

interface Props {
  /** [] = todas */
  value: MetaAdPlatform[]
  onChange: (platforms: MetaAdPlatform[]) => void
}

/** Filtro local (não é filtro global, ver FiltersContext) de "O que os candidatos
 * postam?" — Facebook/Instagram só existem dentro de Meta Ads, então não faz sentido
 * como filtro de rede social do resto do app. */
export function MetaPlatformFilter({ value, onChange }: Props) {
  function toggle(id: MetaAdPlatform) {
    const allSelected = value.length === 0
    const base = allSelected ? PLATFORMS.map((p) => p.id) : value
    const isSelected = allSelected || value.includes(id)
    const next = isSelected ? base.filter((v) => v !== id) : [...base, id]
    onChange(next.length === PLATFORMS.length ? [] : next)
  }

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Qual plataforma da Meta?
      </p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const selected = value.length === 0 || value.includes(platform.id)
          const Icon = platform.icon
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => toggle(platform.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${FOCUS_RING} ${
                selected
                  ? 'border-transparent bg-[var(--tint-primary)] text-[var(--color-primary-dark)]'
                  : 'border-[var(--baseline)] text-[var(--text-muted)]'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
              {platform.label}
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
