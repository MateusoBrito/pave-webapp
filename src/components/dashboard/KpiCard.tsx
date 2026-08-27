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

interface Props {
  label: string
  value: string
  /** cor do valor — só quando o valor em si é a palavra de status (ex. "Negativo") */
  valueColor?: string
  subtext?: string
  subtextSecondary?: string
  icon: LucideIcon
  tone: IconTone
}

export function KpiCard({
  label,
  value,
  valueColor,
  subtext,
  subtextSecondary,
  icon,
  tone,
}: Props) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: CARD_BG[tone] }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)] uppercase">
          {label}
        </p>
        <IconTile icon={icon} tone={tone} size={40} surface="white" />
      </div>
      <p
        className="text-3xl font-semibold"
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      {subtext && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtext}</p>}
      {subtextSecondary && (
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtextSecondary}</p>
      )}
    </div>
  )
}
