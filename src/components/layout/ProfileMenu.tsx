import { useEffect, useRef, useState } from 'react'
import { Bell, HelpCircle, LogOut, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'

const ACCOUNT_ITEMS = [
  { icon: User, label: 'Minha conta', description: 'Nome, e-mail e senha' },
  {
    icon: Bell,
    label: 'Alertas e relatórios',
    description: 'Resumo semanal e picos de volume',
  },
] as const

/**
 * Gatilho de perfil fixado no rodapé da sidebar, com um popover de conta ao clicar.
 * Sem login ainda (Firebase entra depois) — mostra "Convidado" e deixa as ações de
 * conta desabilitadas até a autenticação existir de verdade.
 */
export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
        <Avatar name="Convidado" color="var(--color-primary)" icon={User} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--sidebar-text)]">
            Convidado
          </p>
          <p className="truncate text-xs text-[var(--sidebar-text-muted)]">Sem login</p>
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
            <Avatar name="Convidado" color="var(--color-primary)" icon={User} size={56} />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--text-primary)]">Convidado</p>
              <p className="text-sm text-[var(--text-secondary)]">Sem login</p>
              <span className="mt-1 inline-block rounded-full bg-[var(--tint-blue)] px-2.5 py-0.5 text-xs font-medium text-[var(--tint-text-blue)]">
                Modo convidado
              </span>
            </div>
          </div>

          <div className="my-4 border-t border-[var(--baseline)]" />

          <nav className="flex flex-col gap-1">
            {ACCOUNT_ITEMS.map((item) => (
              <div
                key={item.label}
                title="Disponível após login"
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
            disabled
            title="Disponível após login"
            className="flex w-full cursor-not-allowed items-center gap-2 rounded-xl bg-[var(--tint-coral)] px-3 py-2.5 text-sm font-medium text-[var(--tint-text-coral)] opacity-70"
          >
            <LogOut size={18} strokeWidth={2} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
