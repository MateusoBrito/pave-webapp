import { useEffect, useState } from 'react'
import { Check, Mail, ShieldAlert } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { AuthLayout } from './AuthLayout'

const RESEND_COOLDOWN_SECONDS = 60
const POLL_INTERVAL_MS = 4000

const WEBMAIL_URLS: Record<string, string> = {
  'gmail.com': 'https://mail.google.com',
  'googlemail.com': 'https://mail.google.com',
  'outlook.com': 'https://outlook.live.com/mail',
  'hotmail.com': 'https://outlook.live.com/mail',
  'live.com': 'https://outlook.live.com/mail',
  'yahoo.com': 'https://mail.yahoo.com',
  'icloud.com': 'https://www.icloud.com/mail',
}

function webmailUrlFor(email: string | null | undefined): string {
  const domain = email?.split('@')[1]?.toLowerCase()
  return (domain && WEBMAIL_URLS[domain]) || 'mailto:'
}

/**
 * Tela que o RequireAuth mostra no lugar do app quando o e-mail ainda não foi
 * verificado (só se aplica a contas por senha — login Google já vem verificado). A
 * conta só "existe de verdade" (userData gravado) depois que o e-mail é confirmado —
 * ver AuthContext.refreshUser. Desistir aqui sem confirmar apaga a conta criada.
 */
export function VerifyEmailNotice() {
  const { user, cancelSignup, refreshUser } = useAuth()
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [resending, setResending] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // detecta sozinho quando o link foi clicado (em outra aba) e libera o painel sem F5
  useEffect(() => {
    const poll = setInterval(() => {
      refreshUser().catch(() => {
        // conexão instável — tenta de novo no próximo ciclo
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [refreshUser])

  async function handleResend() {
    if (!user || cooldown > 0) return
    setError('')
    setResending(true)
    try {
      await sendEmailVerification(user)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reenviar o link.')
    } finally {
      setResending(false)
    }
  }

  async function handleCancel() {
    setError('')
    setCanceling(true)
    try {
      await cancelSignup()
      // sucesso: user vira null, RequireAuth manda pro /login sozinho
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível cancelar o cadastro.',
      )
      setCanceling(false)
    }
  }

  const minutes = Math.floor(cooldown / 60)
  const seconds = cooldown % 60

  return (
    <AuthLayout>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center"
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tint-green)] text-[var(--tint-text-green)]">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
          Verifique seu e-mail
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Enviamos um link de confirmação. Clique nele para ativar sua conta e entrar no
          painel.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--tint-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-dark)]">
          <Mail size={16} />
          {user?.email}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-[var(--tint-coral)] px-3 py-2 text-sm text-[var(--tint-text-coral)]">
            {error}
          </p>
        )}

        <Button
          variant="secondary"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || canceling}
          className="mt-6 w-full"
        >
          {cooldown > 0
            ? `Reenviar link em ${minutes}:${String(seconds).padStart(2, '0')}`
            : resending
              ? 'Enviando…'
              : 'Reenviar link'}
        </Button>

        <a
          href={webmailUrlFor(user?.email)}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-3 block w-full rounded text-sm font-medium text-[var(--color-primary-dark)] hover:underline ${FOCUS_RING}`}
        >
          Abrir meu e-mail
        </a>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-[var(--page-plane)] px-3 py-2.5 text-left text-xs text-[var(--text-secondary)]">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          <p>
            Não recebeu? Confira a caixa de spam ou{' '}
            <button
              type="button"
              onClick={handleCancel}
              disabled={canceling}
              className="font-medium text-[var(--color-primary-dark)] hover:underline disabled:opacity-60"
            >
              volte ao cadastro
            </button>{' '}
            para corrigir o e-mail.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={canceling}
          className={`mt-6 rounded text-sm font-medium text-[var(--text-secondary)] hover:underline disabled:opacity-60 ${FOCUS_RING}`}
        >
          {canceling ? 'Cancelando…' : '← Voltar para o login'}
        </button>
      </div>
    </AuthLayout>
  )
}
