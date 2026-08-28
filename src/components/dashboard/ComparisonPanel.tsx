import { useState } from 'react'
import { AlertTriangle, ChevronRight, Inbox } from 'lucide-react'
import type { ComparisonCandidateSummary, PeriodFilter } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import type { Network } from '../../types'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { KpiCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { CandidateTopicsModal } from './CandidateTopicsModal'
import { SentimentBar } from './SentimentBar'

interface Props {
  tag: 'A' | 'B'
  summary: ComparisonCandidateSummary | undefined
  /** share do candidato sobre o total de menções de A+B somados neste comparativo */
  sharePct: number
  loading: boolean
  error?: Error
  refetch?: () => void
  network: Network
  period: PeriodFilter
}

/** Painel espelhado do Comparativo — um por candidato (A à esquerda, B à direita). */
export function ComparisonPanel({
  tag,
  summary,
  sharePct,
  loading,
  error,
  refetch,
  network,
  period,
}: Props) {
  const { setDays, clearFilters } = useFilters()
  const [topicsModalOpen, setTopicsModalOpen] = useState(false)

  if (error) {
    return (
      <div className="flex-1">
        <StatusCard
          icon={AlertTriangle}
          tone="coral"
          title="Não foi possível carregar"
          description="Falha ao consultar a API. Seus filtros foram mantidos — é só tentar de novo."
          primaryAction={
            refetch ? { label: 'Tentar novamente', onClick: refetch } : undefined
          }
          secondaryAction={{
            label: `Copiar código do erro · ${error.message || '500'}`,
            onClick: () => navigator.clipboard?.writeText(error.message || '500'),
          }}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1">
        <KpiCardSkeleton />
      </div>
    )
  }

  if (!summary || summary.mentions === 0) {
    return (
      <div className="flex-1">
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhuma menção neste período"
          description="Ninguém falou sobre este candidato no intervalo selecionado."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      </div>
    )
  }

  const color = candidateColor(summary.entity.id)
  const maxTopic = Math.max(...summary.topTopics.map((t) => t.mentions), 1)

  return (
    <div
      className="flex flex-1 flex-col gap-[18px] rounded-[18px] border-t-4 bg-white p-[22px]"
      style={{ borderTopColor: color, boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <Avatar
          name={summary.entity.name}
          color={color}
          size={46}
          photoUrl={summary.entity.photoUrl}
        />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {summary.entity.name}
            </p>
            <span
              className="rounded-md px-2 py-0.5 text-[9px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {tag}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {summary.mentions.toLocaleString('pt-BR')} menções · {sharePct.toFixed(0)}% do
            total do período
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-[9px]">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold tracking-[0.8px] text-[var(--text-muted)] uppercase">
            Sentimento agregado
          </p>
          <div className="flex items-center gap-[11px]">
            <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)]">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--color-green)]" />
              Pos
            </span>
            <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)]">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--gridline)]" />
              Neu
            </span>
            <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)]">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-[var(--color-coral)]" />
              Neg
            </span>
          </div>
        </div>
        <SentimentBar sentiment={summary.sentiment} size="lg" showLabels />
      </div>

      <div className="flex flex-col gap-[10px]">
        <p className="text-[9px] font-bold tracking-[0.8px] text-[var(--text-muted)] uppercase">
          Principais tópicos · Top {summary.topTopics.length}
        </p>
        {summary.topTopics.map((t, i) => (
          <div key={t.topic.id} className="flex items-center gap-[11px]">
            <span className="w-[14px] shrink-0 text-[10px] font-bold text-[var(--text-muted)]">
              {i + 1}
            </span>
            <span className="w-[40%] shrink-0 truncate text-[11px] font-semibold text-[var(--text-primary)]">
              {t.topic.label}
            </span>
            <span className="h-[9px] flex-1 overflow-hidden rounded-[5px] bg-[var(--gridline)]">
              <span
                className="block h-full rounded-[5px]"
                style={{
                  width: `${(t.mentions / maxTopic) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-[11px] text-[var(--text-secondary)]">
              {t.mentions.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
        {summary.otherTopicsCount > 0 && (
          <p className="text-[10px] text-[var(--text-muted)]">
            Outros {summary.otherTopicsCount} tópicos ·{' '}
            {summary.otherTopicsMentions.toLocaleString('pt-BR')} menções
          </p>
        )}
        <button
          type="button"
          onClick={() => setTopicsModalOpen(true)}
          className={`flex items-center justify-center gap-1.5 rounded-[9px] bg-[var(--tint-primary)] px-3 py-2.5 text-[11px] font-semibold text-[var(--color-primary-dark)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
        >
          Ver todos os tópicos deste candidato
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      </div>

      <CandidateTopicsModal
        open={topicsModalOpen}
        onClose={() => setTopicsModalOpen(false)}
        entityId={summary.entity.id}
        network={network}
        period={period}
      />
    </div>
  )
}
