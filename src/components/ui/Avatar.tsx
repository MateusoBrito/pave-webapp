import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  name: string
  color: string
  size?: number
  selected?: boolean
  /** tom neutro/desabilitado — usado pro slot "Outros" (candidato futuro, Fase 6) */
  muted?: boolean
  /** substitui as iniciais por um ícone — usado quando não há identidade real (ex.: "Outros") */
  icon?: LucideIcon
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar com iniciais — não usamos foto real de figura pública neste app. */
export function Avatar({
  name,
  color,
  size = 44,
  selected = false,
  muted = false,
  icon: Icon,
}: Props) {
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-semibold"
        style={{
          backgroundColor: muted ? 'var(--gridline)' : color,
          color: muted ? 'var(--text-muted)' : '#ffffff',
          fontSize: size * 0.36,
        }}
      >
        {Icon ? <Icon size={size * 0.5} strokeWidth={2} /> : initials(name)}
      </div>
      {selected && (
        <span
          className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-[var(--chart-surface)] bg-[var(--color-primary)] text-white"
          style={{ width: size * 0.42, height: size * 0.42 }}
        >
          <Check size={size * 0.26} strokeWidth={3} />
        </span>
      )}
    </div>
  )
}
