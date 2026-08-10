import { NavLink } from 'react-router-dom'

const NAV_ITEMS: { to: string; label: string; badge?: string }[] = [
  { to: '/', label: 'Visão Geral' },
  { to: '/topicos', label: 'Tópicos' },
  { to: '/comparativo', label: 'Comparativo' },
  { to: '/comunidades', label: 'Comunidades', badge: 'FASE 5' },
  { to: '/metodologia', label: 'Metodologia' },
]

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col gap-8 border-r border-[var(--baseline)] bg-[var(--sidebar-surface)] px-4 py-6">
      <div>
        <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
          PAVE
        </p>
        <p className="text-xs text-[var(--text-muted)]">Panorama Eleitoral 2026</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--chart-surface)]'
                  : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10'
              }`
            }
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="rounded-full border border-[var(--baseline)] px-1.5 py-0.5 text-[10px] tracking-wide text-[var(--text-muted)]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
