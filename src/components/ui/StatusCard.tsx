import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { FOCUS_RING } from './focusRing'
import { IconTile, type IconTone } from './IconTile'

interface Action {
  label: string
  onClick: () => void
}

interface Props {
  icon: LucideIcon
  tone: IconTone
  title: string
  description: string
  primaryAction?: Action
  secondaryAction?: Action
}

/** Card autocontido pra vazio/sem-resultado/erro/permissão — substitui o card inteiro
 * (o header do card normal não aparece junto, é o próprio StatusCard que ocupa o espaço). */
export function StatusCard({
  icon,
  tone,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-[14px] rounded-2xl bg-[var(--chart-surface)] px-5 py-[26px] text-center"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <IconTile icon={icon} tone={tone} size={56} />
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {primaryAction && (
        <Button
          variant="primary"
          onClick={primaryAction.onClick}
          className="w-full max-w-xs"
        >
          {primaryAction.label}
        </Button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className={`rounded px-1 text-sm text-[var(--color-primary-dark)] underline-offset-2 hover:underline ${FOCUS_RING}`}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  )
}
