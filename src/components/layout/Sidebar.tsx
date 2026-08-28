import { Columns3, Home, Info, Megaphone, MessageCircle, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { FOCUS_RING } from '../ui/focusRing'
import { ProfileMenu } from './ProfileMenu'

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

/** O drill-down de tópico (/topicos/:id) não tem item próprio no menu — ele "pertence"
 * à seção de onde o usuário entrou. Por padrão isso é "O que os usuários comentam?" (é
 * lá que mora o ranking de tópicos), mas dá pra chegar lá também pelo "Ver detalhes" da
 * Visão Geral — nesse caso o item ativo deve continuar sendo Visão Geral, sem trocar de
 * aba embaixo do usuário. Cada ponto de entrada informa de onde veio via
 * `state: { from }` no `navigate()` (ver TopTopicsTable); sem isso, cai no padrão. */
function useActiveNavPath(): string {
  const location = useLocation()
  const isTopicDetail = /^\/topicos\/[^/]+$/.test(location.pathname)
  if (!isTopicDetail) return location.pathname
  const from = (location.state as { from?: string } | null)?.from
  return from ?? '/topicos'
}

export function Sidebar({ open, onClose }: Props) {
  const activePath = useActiveNavPath()

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full transform flex-col justify-between bg-[var(--sidebar-bg)] px-4 py-6 transition-transform duration-200 lg:w-[280px] lg:translate-x-0 ${
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
            {NAV_ITEMS.map((item) => {
              const isActive = item.to === activePath
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm leading-tight transition-colors ${FOCUS_RING} ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]'
                  }`}
                >
                  <item.icon size={18} strokeWidth={2} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <ProfileMenu />
      </aside>
    </>
  )
}
