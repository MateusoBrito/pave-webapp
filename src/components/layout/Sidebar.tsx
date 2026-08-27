import { Columns3, Home, Info, Megaphone, MessageCircle, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Visão Geral', icon: Home },
  { to: '/topicos', label: 'O que os usuários comentam?', icon: MessageCircle },
  { to: '/posts', label: 'O que os candidatos postam?', icon: Megaphone },
  { to: '/comparativo', label: 'Comparativo', icon: Columns3 },
  { to: '/metodologia', label: 'Metodologia', icon: Info },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full transform flex-col justify-between bg-[var(--sidebar-bg)] px-4 py-6 transition-transform duration-200 lg:static lg:z-auto lg:w-full lg:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-lg font-bold tracking-tight text-[var(--sidebar-text)]">
                PAVE 2026
              </p>
              <p className="text-xs text-[var(--sidebar-text-muted)]">
                Panorama Virtual das Eleições
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className={`rounded-lg p-1.5 text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover-bg)] lg:hidden ${FOCUS_RING}`}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm leading-tight transition-colors ${FOCUS_RING} ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]'
                  }`
                }
              >
                <item.icon size={18} strokeWidth={2} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--sidebar-border)] px-1 pt-4">
          <Avatar name="Lucas Rivetti" color="var(--color-primary)" size={36} />
          <div>
            <p className="text-sm font-medium text-[var(--sidebar-text)]">
              Lucas Rivetti
            </p>
            <p className="text-xs text-[var(--sidebar-text-muted)]">Equipe LabPi</p>
          </div>
        </div>
      </aside>
    </>
  )
}
