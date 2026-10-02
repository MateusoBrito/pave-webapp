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
  icon: LucideIcon
  tone: IconTone
  totalValue: string
  totalSubtext?: string
  dayValue: string
  daySubtext?: string
  dayLabel?: string
}

export function DualKpiCard({
  label,
  icon,
  tone,
  totalValue,
  totalSubtext,
  dayValue,
  daySubtext,
  dayLabel = 'Neste Dia',
}: Props) {
  return (
    <div
      className="flex flex-1 flex-col gap-4 rounded-2xl p-5"
      style={{ backgroundColor: CARD_BG[tone], boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size={40} surface="white" />
        <p className="text-xs font-bold tracking-wide text-[var(--text-secondary)] uppercase">
          {label}
        </p>
      </div>

      <div className="flex flex-col gap-3 ml-2">
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Acumulado da Campanha</p>
          <p className="text-2xl font-bold leading-tight" style={{ color: TEXT_COLOR[tone] }}>
            {totalValue}
          </p>
          {totalSubtext && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{totalSubtext}</p>}
        </div>

        <div className="h-[1px] w-full bg-black/5" />

        <div className="flex flex-col">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">{dayLabel}</p>
          <p className="text-2xl font-bold leading-tight" style={{ color: TEXT_COLOR[tone] }}>
            {dayValue}
          </p>
          {daySubtext && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{daySubtext}</p>}
        </div>
      </div>
    </div>
  )
}

