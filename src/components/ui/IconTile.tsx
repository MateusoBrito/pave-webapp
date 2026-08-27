import type { LucideIcon } from 'lucide-react'

export type IconTone =
  'purple' | 'green' | 'coral' | 'amber' | 'pink' | 'blue' | 'graphite'

const ICON_COLOR: Record<IconTone, string> = {
  purple: 'var(--color-primary)',
  green: 'var(--color-green)',
  coral: 'var(--color-coral)',
  amber: 'var(--color-amber)',
  pink: 'var(--color-pink)',
  blue: 'var(--color-blue)',
  graphite: 'var(--text-secondary)',
}

const TINT_BG: Record<IconTone, string> = {
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
  /** px — o guia especifica 48px como tamanho de referência */
  size?: number
  /** 'tint' (padrão) = fundo pastel, usado sobre card branco. 'white' = fundo branco,
   * usado quando o tile já está sobre um card com fundo tintado (KPI, destaque). */
  surface?: 'tint' | 'white'
}

/** Tile de ícone 48px, raio 14 — "Estilo visual · PAVE". */
export function IconTile({ icon: Icon, tone, size = 48, surface = 'tint' }: Props) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[14px]"
      style={{
        width: size,
        height: size,
        backgroundColor: surface === 'white' ? 'var(--chart-surface)' : TINT_BG[tone],
        color: ICON_COLOR[tone],
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2} />
    </div>
  )
}
