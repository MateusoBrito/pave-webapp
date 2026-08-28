import { MessageSquare, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { getOverviewSummary, getTopics } from '../../api/client'
import { useAsync } from '../../hooks'
import { lastNDaysPeriod } from '../../lib/dates'
import { NETWORKS } from '../../types'

function FeatureRow({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-white/70">{subtitle}</p>
      </div>
    </div>
  )
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  )
}

/**
 * Shell de duas colunas comum a todas as telas de autenticação (login, cadastro,
 * recuperar acesso, verificar e-mail, nova senha) — painel roxo da marca à esquerda,
 * área centralizada à direita que recebe o card da tela específica.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { data: summary } = useAsync(
    () => getOverviewSummary([], lastNDaysPeriod(30), []),
    [],
  )
  const { data: topics } = useAsync(() => getTopics(), [])

  return (
    <div className="flex min-h-screen">
      <div
        className="relative hidden w-[42%] shrink-0 flex-col justify-center gap-10 overflow-hidden px-14 py-12 lg:flex"
        style={{ background: 'linear-gradient(135deg, #8B6BFF 0%, #4B2FD6 100%)' }}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/8" />

        <div className="relative z-10">
          <p className="text-2xl font-bold tracking-tight text-white">PAVE</p>
          <p className="text-sm text-white/70">
            Panorama Virtual das Eleições 2026 · LabPi
          </p>
        </div>

        <h1 className="relative z-10 text-3xl font-bold text-white">
          O que está movimentando a conversa eleitoral?
        </h1>

        <div className="relative z-10 flex flex-col gap-5">
          <FeatureRow
            icon={MessageSquare}
            title="Sobre o que estão falando?"
            subtitle="Tópicos dominantes e evolução no tempo"
          />
          <FeatureRow
            icon={TrendingUp}
            title="Como estão falando?"
            subtitle="Sentimento negativo, neutro e positivo"
          />
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <StatChip
            value={summary ? summary.totalMentions.toLocaleString('pt-BR') : '—'}
            label="menções"
          />
          <StatChip value={String(NETWORKS.length)} label="redes sociais" />
          <StatChip value={topics ? String(topics.length) : '—'} label="tópicos" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F7F7FA] p-6">
        {children}
      </div>
    </div>
  )
}
