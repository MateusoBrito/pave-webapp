export interface PasswordStrength {
  score: 0 | 1 | 2 | 3
  hasLength8: boolean
  hasUpper: boolean
  hasNumber: boolean
}

export function computeStrength(password: string): PasswordStrength {
  const hasLength8 = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const score = [hasLength8, hasUpper, hasNumber].filter(Boolean).length as 0 | 1 | 2 | 3
  return { score, hasLength8, hasUpper, hasNumber }
}

const SEGMENT_COLOR: Record<number, string> = {
  1: 'var(--color-coral)',
  2: 'var(--color-amber)',
  3: 'var(--color-green)',
}

const LABEL: Record<number, string> = {
  0: '',
  1: 'Senha fraca',
  2: 'Senha média',
  3: 'Senha forte',
}

interface Props {
  password: string
  /** texto extra depois do rótulo de força, ex.: "mínimo 8 caracteres, com número e maiúscula" */
  hint?: string
}

/** Barra de força em 3 segmentos, reaproveitada no cadastro e na troca de senha. */
export function PasswordStrengthBar({ password, hint }: Props) {
  if (!password) return null
  const { score } = computeStrength(password)
  const color = SEGMENT_COLOR[score] ?? 'var(--gridline)'

  return (
    <div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < score ? color : 'var(--gridline)' }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
        <span style={{ color: score > 0 ? color : undefined }}>{LABEL[score]}</span>
        {hint ? ` · ${hint}` : ''}
      </p>
    </div>
  )
}
