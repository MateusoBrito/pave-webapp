import { useEffect, useRef, useState } from 'react'
import { Bell, HelpCircle, LogOut, User } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { AccountModal } from './AccountModal'

const DISABLED_ITEMS = [
  {
    icon: Bell,
    label: 'Alertas e relatórios',
    description: 'Resumo semanal e picos de volume',
  },
] as const

/** Gatilho de perfil fixado no rodapé da sidebar, com um popover de conta ao clicar. */
export function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayName = user?.displayName || user?.email || 'Usuário'
  const subtitle = user?.displayName ? (user.email ?? '') : 'Conta PAVE'

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative mt-4 shrink-0 px-1 pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-2xl bg-[var(--sidebar-hover-bg)] px-3 py-2.5 text-left transition-colors hover:bg-white/10 ${FOCUS_RING}`}
      >
        <Avatar
          name={displayName}
          color="var(--color-primary)"
          photoUrl={user?.photoURL ?? undefined}
          size={36}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--sidebar-text)]">
            {displayName}
          </p>
          <p className="truncate text-xs text-[var(--sidebar-text-muted)]">{subtitle}</p>
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Perfil"
          className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl bg-[var(--chart-surface)] p-5 sm:left-[300px]"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center gap-3">
            <Avatar
              name={displayName}
              color="var(--color-primary)"
              photoUrl={user?.photoURL ?? undefined}
              size={56}
            />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--text-primary)]">{displayName}</p>
              {user?.displayName && user.email && (
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <div className="my-4 border-t border-[var(--baseline)]" />

          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setAccountOpen(true)
              }}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/5 ${FOCUS_RING}`}
            >
              <User
                size={20}
                strokeWidth={2}
                className="shrink-0 text-[var(--text-secondary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Minha conta
                </p>
                <p className="text-xs text-[var(--text-muted)]">Nome, e-mail e senha</p>
              </div>
            </button>
            {DISABLED_ITEMS.map((item) => (
              <div
                key={item.label}
                title="Disponível em breve"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-2 py-2"
              >
                <item.icon
                  size={20}
                  strokeWidth={2}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                </div>
              </div>
            ))}
            <NavLink
              to="/metodologia"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/5 ${FOCUS_RING}`}
            >
              <HelpCircle
                size={20}
                strokeWidth={2}
                className="shrink-0 text-[var(--text-secondary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Ajuda e metodologia
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Como os dados são coletados e tratados
                </p>
              </div>
            </NavLink>
          </nav>

          <div className="my-4 border-t border-[var(--baseline)]" />

          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-xl bg-[var(--tint-coral)] px-3 py-2.5 text-sm font-medium text-[var(--tint-text-coral)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
          >
            <LogOut size={18} strokeWidth={2} />
            Sair
          </button>
        </div>
      )}

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  )
}
