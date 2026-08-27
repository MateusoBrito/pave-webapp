import type { LucideIcon } from 'lucide-react'
import { IconTile, type IconTone } from '../ui/IconTile'

const CARD_BG: Record<IconTone, string> = {
  purple: 'var(--tint-primary)',
  green: 'var(--tint-green)',
  coral: 'var(--tint-coral)',
  amber: 'var(--tint-amber)',
  pink: 'var(--tint-pink)',
  blue: 'var(--tint-blue)',
  graphite: 'var(--tint-graphite)',
}

const TEXT_COLOR: Record<IconTone, string> = {
  purple: 'var(--tint-text-primary)',
  green: 'var(--tint-text-green)',
  coral: 'var(--tint-text-coral)',
  amber: 'var(--tint-text-amber)',
  blue: 'var(--tint-text-blue)',
  pink: 'var(--color-pink)',
  graphite: 'var(--text-primary)',
}

interface Props {
  label: string
  value: string
  subtext?: string
  /** cor da 1ª linha de subtexto — por padrão usa a cor do tema (ex.: delta positivo/negativo) */
  subtextColor?: string
  subtextSecondary?: string
  icon: LucideIcon
  tone: IconTone
}

export function KpiCard({
  label,
  value,
  subtext,
  subtextColor,
  subtextSecondary,
  icon,
  tone,
}: Props) {
  return (
    <div
      className="flex flex-1 items-center gap-[15px] rounded-2xl p-5"
      style={{ backgroundColor: CARD_BG[tone], boxShadow: 'var(--card-shadow)' }}
    >
      <IconTile icon={icon} tone={tone} size={44} surface="white" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)] uppercase">
          {label}
        </p>
        <p className="text-2xl font-bold" style={{ color: TEXT_COLOR[tone] }}>
          {value}
        </p>
        {subtext && (
          <p
            className="mt-0.5 text-xs font-medium"
            style={{ color: subtextColor ?? TEXT_COLOR[tone] }}
          >
            {subtext}
          </p>
        )}
        {subtextSecondary && (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtextSecondary}</p>
        )}
      </div>
    </div>
  )
}
