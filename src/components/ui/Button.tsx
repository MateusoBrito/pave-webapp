import type { ButtonHTMLAttributes } from 'react'
import { FOCUS_RING } from './focusRing'

type Variant = 'primary' | 'secondary' | 'outline'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]',
  secondary:
    'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] hover:brightness-95',
  outline:
    'bg-[var(--chart-surface)] border border-[var(--baseline)] text-[var(--text-primary)] hover:bg-black/5',
}

export function Button({
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${FOCUS_RING} ${
        disabled
          ? 'cursor-not-allowed bg-[var(--gridline)] text-[var(--text-muted)]'
          : VARIANT_CLASS[variant]
      } ${className}`}
      {...props}
    />
  )
}
