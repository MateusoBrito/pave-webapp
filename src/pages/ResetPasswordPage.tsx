import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, Check, Circle, Eye, EyeOff, Lock } from 'lucide-react'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout'
import { INPUT_FIELD, INPUT_SHELL } from '../components/auth/authField'
import { computeStrength, PasswordStrengthBar } from '../components/auth/PasswordStrength'
import { Button } from '../components/ui/Button'
import { FOCUS_RING } from '../components/ui/focusRing'
import { IconTile } from '../components/ui/IconTile'
import { StatusCard } from '../components/ui/StatusCard'
import { auth } from '../lib/firebase'

type Status = 'checking' | 'valid' | 'invalid'

function ChecklistItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check size={14} className="shrink-0 text-[var(--color-green)]" />
      ) : (
        <Circle size={14} className="shrink-0 text-[var(--text-muted)]" />
      )}
      <span className={met ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>
        {label}
      </span>
    </div>
  )
}

/**
 * Página que o link de "esqueci minha senha" abre de verdade — o Firebase manda o
 * e-mail com um oobCode direto pra cá (`AuthContext.resetPassword` já configura
 * `actionCodeSettings.handleCodeInApp: true`), em vez da página genérica dele.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const oobCode = searchParams.get('oobCode')

  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid')
      return
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(() => setStatus('valid'))
      .catch(() => setStatus('invalid'))
  }, [oobCode])

  const strength = computeStrength(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canSubmit = strength.score === 3 && passwordsMatch

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!oobCode || !canSubmit) return
    setError('')
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a nova senha. Peça um novo link.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8"
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--text-muted)]">Verificando o link…</p>
          </div>
        )}

        {status === 'invalid' && (
          <StatusCard
            icon={AlertTriangle}
            tone="coral"
            title="Link inválido ou expirado"
            description="Esse link de redefinição de senha não é mais válido. Peça um novo na tela de login."
            primaryAction={{
              label: 'Voltar para o login',
              onClick: () => navigate('/login'),
            }}
          />
        )}

        {status === 'valid' && (
          <>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`mb-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </button>

            <IconTile icon={Lock} tone="purple" size={48} />

            <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
              Criar uma nova senha
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Escolha uma senha diferente das anteriores. Este link expira 30 minutos
              depois de ter sido enviado.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Nova senha
                </span>
                <div className={INPUT_SHELL}>
                  <Lock size={18} className="shrink-0 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••"
                    className={INPUT_FIELD}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className={`shrink-0 rounded text-[var(--text-muted)] ${FOCUS_RING}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
              </label>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <ChecklistItem
                  met={strength.hasLength8}
                  label="Pelo menos 8 caracteres"
                />
                <ChecklistItem met={strength.hasUpper} label="Uma letra maiúscula" />
                <ChecklistItem met={strength.hasNumber} label="Um número" />
                <ChecklistItem met={false} label="Diferente da senha anterior" />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Confirmar nova senha
                </span>
                <div className={INPUT_SHELL}>
                  <Lock size={18} className="shrink-0 text-[var(--text-muted)]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••••"
                    className={INPUT_FIELD}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className={`shrink-0 rounded text-[var(--text-muted)] ${FOCUS_RING}`}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <span className="text-xs text-[var(--tint-text-coral)]">
                    As senhas não são iguais.
                  </span>
                )}
              </label>

              {error && (
                <p className="rounded-lg bg-[var(--tint-coral)] px-3 py-2 text-sm text-[var(--tint-text-coral)]">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !canSubmit}
                className="w-full"
              >
                {submitting ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-2 rounded-xl bg-[var(--page-plane)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
              <Lock size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
              <p>
                Ao salvar, todas as sessões abertas nos outros dispositivos serão
                encerradas.
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
