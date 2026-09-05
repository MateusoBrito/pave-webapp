import { AlertTriangle, Hash, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdTopicDetail } from '../../api/client'
import type { Entity } from '../../types'
import { formatBRLRange } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { Skeleton } from '../ui/Skeleton'
import { StatusCard } from '../ui/StatusCard'

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-bold tracking-[0.8px] text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className="text-[19px] font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

interface Props {
  detail: AdTopicDetail | undefined
  ownerEntity: Entity | undefined
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** Header do drill-down de tópico de anúncio - análogo a TopicHeader.tsx, mas sem
 * sentimento (anúncio pago não tem reação pública coletável, ver PostsPage.tsx) e com
 * investimento/anúncios veiculados no lugar de menções/sentimento predominante. */
export function AdTopicHeader({ detail, ownerEntity, loading, error, refetch }: Props) {
  const navigate = useNavigate()

  if (error) {
    return (
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
    )
  }

  if (loading) {
    return (
      <section
        className="rounded-[18px] bg-[var(--chart-surface)] p-[22px]"
        style={{ boxShadow: 'var(--card-shadow)' }}
      >
        <Skeleton className="h-3 w-56" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-[52px] w-[52px] rounded-2xl" />
            <div>
              <Skeleton className="h-6 w-56" />
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!detail) {
    return (
      <StatusCard
        icon={Search}
        tone="graphite"
        title="Tópico não encontrado"
        description="Esse tópico pode não ter anúncios no período selecionado."
        primaryAction={{
          label: 'Voltar para Anúncios',
          onClick: () => navigate('/posts'),
        }}
      />
    )
  }

  return (
    <section
      className="flex flex-col gap-[18px] rounded-[18px] bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <Link
          to="/posts"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          O que os candidatos postam?
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-secondary)]">
          {detail.topic.label}
          {ownerEntity ? ` · ${ownerEntity.name}` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <IconTile icon={Hash} tone="pink" size={52} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {detail.topic.label}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {detail.topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[7px] bg-[var(--page-plane)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <Indicator
            label="Investimento"
            value={formatBRLRange(detail.investmentMinBRL, detail.investmentMaxBRL)}
          />
          <Indicator label="Anúncios" value={detail.adsCount.toLocaleString('pt-BR')} />
        </div>
      </div>
    </section>
  )
}
