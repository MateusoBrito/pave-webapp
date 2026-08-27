import type { LucideIcon } from 'lucide-react'
import { IconTile, type IconTone } from '../ui/IconTile'

const TITLE_COLOR: Record<IconTone, string> = {
  purple: 'var(--tint-text-primary)',
  green: 'var(--tint-text-green)',
  coral: 'var(--tint-text-coral)',
  amber: 'var(--tint-text-amber)',
  blue: 'var(--tint-text-blue)',
  pink: 'var(--color-pink)',
  graphite: 'var(--text-primary)',
}

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
  icon: LucideIcon
  tone: IconTone
  title: string
  description: string
}

/** "Cards de destaque" — ícone (tile branco) + título na cor do tema + descrição. */
export function HighlightCard({ icon, tone, title, description }: Props) {
  return (
    <div
      className="flex flex-1 items-center gap-[15px] rounded-2xl p-5"
      style={{ backgroundColor: CARD_BG[tone], boxShadow: 'var(--card-shadow)' }}
    >
      <IconTile icon={icon} tone={tone} size={44} surface="white" />
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: TITLE_COLOR[tone] }}>
          {title}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  )
}
