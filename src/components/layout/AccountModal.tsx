import { useState } from 'react'
import { AlertTriangle, Check, KeyRound, LogOut, ShieldCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile } from '../ui/IconTile'
import { Modal } from '../ui/Modal'

const PROVIDER_LABEL: Record<string, string> = {
  'google.com': 'Google',
  password: 'E-mail e senha',
}

function formatAccountDate(value: string | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface Props {
  open: boolean
  onClose: () => void
}

/** "Minha conta" — dados reais da sessão Firebase Auth: identidade, verificação,
 * método de login e datas de criação/último acesso. Redefinir senha e sair são ações
 * reais (reaproveitam o que o AuthContext já expõe). */
export function AccountModal({ open, onClose }: Props) {
  const { user, resetPassword, logout } = useAuth()
  const navigate = useNavigate()
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )

  if (!open || !user) return null

  const displayName = user.displayName || 'Usuário'
  const providerId = user.providerData[0]?.providerId ?? 'password'
  const providerLabel = PROVIDER_LABEL[providerId] ?? providerId
  const isPasswordAccount = providerId === 'password'

  async function handleResetPassword() {
    if (!user?.email) return
    setResetState('sending')
    try {
      await resetPassword(user.email)
      setResetState('sent')
    } catch {
      setResetState('error')
    }
  }

  async function handleLogout() {
    onClose()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Minha conta">
      <div className="flex w-full items-start justify-between gap-4">
        <h2 className="text-[22px] font-bold text-[var(--text-primary)]">Minha conta</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`shrink-0 rounded-[10px] bg-[var(--gridline)] p-2.5 text-[var(--text-secondary)] hover:bg-black/10 ${FOCUS_RING}`}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex w-full items-center gap-4 rounded-xl border border-[var(--baseline)] bg-[var(--page-plane)] p-4">
        <Avatar
          name={displayName}
          color="var(--color-primary)"
          photoUrl={user.photoURL ?? undefined}
          size={54}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[var(--text-primary)]">
            {displayName}
          </p>
          <p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p>
          {user.emailVerified && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--tint-green)] px-2 py-0.5 text-[10px] font-bold text-[var(--tint-text-green)]">
              <ShieldCheck size={11} />
              E-mail verificado
            </span>
          )}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--baseline)] p-3.5">
          <p className="text-[9px] font-bold tracking-[0.7px] text-[var(--text-muted)] uppercase">
            Método de login
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {providerLabel}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--baseline)] p-3.5">
          <p className="text-[9px] font-bold tracking-[0.7px] text-[var(--text-muted)] uppercase">
            Conta criada em
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {formatAccountDate(user.metadata.creationTime)}
          </p>
        </div>
      </div>

      {isPasswordAccount && (
        <div className="flex w-full items-start gap-3 rounded-xl border border-[var(--baseline)] p-4">
          <IconTile icon={KeyRound} tone="purple" size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Senha</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              Enviamos um link de redefinição para o seu e-mail cadastrado.
            </p>
            {resetState === 'sent' ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--tint-text-green)]">
                <Check size={13} />
                E-mail enviado — confira sua caixa de entrada.
              </p>
            ) : resetState === 'error' ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--tint-text-coral)]">
                <AlertTriangle size={13} />
                Não foi possível enviar. Tente novamente.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetState === 'sending'}
                className={`mt-2 text-[11px] font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline disabled:opacity-60 ${FOCUS_RING}`}
              >
                {resetState === 'sending'
                  ? 'Enviando…'
                  : 'Enviar e-mail para redefinir senha'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center gap-2 rounded-xl bg-[var(--tint-coral)] px-4 py-2 text-sm font-medium text-[var(--tint-text-coral)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
        >
          <LogOut size={15} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </Modal>
  )
}
