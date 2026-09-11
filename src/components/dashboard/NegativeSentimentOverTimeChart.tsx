import { AlertTriangle, Inbox, TrendingDown } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { CandidateSentimentPoint } from '../../api/client'
import type { Entity } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  entities: Entity[]
  points: CandidateSentimentPoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

const LEGEND = [
  { key: 'positive', label: 'Positivo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'negative', label: 'Negativo' },
] as const

interface LinhaDiaria {
  date: string
  Negativo: number
  Neutro: number
  Positivo: number
}

/** Contagem absoluta com o percentual do dia ao lado: a altura da barra continua sendo
 * volume (um dia fraco não pode parecer igual a um pico), e o percentual responde "como
 * estava o humor naquele dia" sem precisar de um segundo gráfico normalizado. */
function renderTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((soma, item) => soma + Number(item.value ?? 0), 0) || 1
  return (
    <div className="rounded-[10px] border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-semibold text-[var(--text-primary)]">
        {formatShortDate(String(label))}
      </p>
      {payload.map((item) => {
        const valor = Number(item.value ?? 0)
        const pct = Math.round((valor / total) * 100)
        return (
          <p
            key={String(item.dataKey)}
            className="text-[11px] text-[var(--text-secondary)]"
          >
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle"
              style={{ backgroundColor: String(item.color) }}
            />
            {String(item.dataKey)}: {valor.toLocaleString('pt-BR')} ({pct}%)
          </p>
        )
      })}
    </div>
  )
}

/** "Sentimento ao longo do tempo" do Comparativo — um painel por candidato, cada um com
 * a distribuição diária empilhada (negativo/neutro/positivo).
 *
 * Era uma linha só, com o % negativo de cada candidato sobreposto. Virou small multiples
 * a pedido da Ester, para ficar coerente com os outros cards de sentimento do painel. A
 * comparação entre candidatos, que era o motivo do formato antigo, se mantém porque os
 * painéis dividem o mesmo eixo de datas e ficam lado a lado — o que não daria para fazer
 * empilhando dois candidatos × três rótulos no mesmo gráfico.
 *
 * O eixo Y é contagem, não percentual: cada candidato tem volume próprio, e normalizar
 * cada painel para 100% esconderia que um deles mal tem comentário classificado no dia. */
export function NegativeSentimentOverTimeChart({
  entities,
  points,
  loading,
  error,
  refetch,
}: Props) {
  const { setDays, clearFilters } = useFilters()

  const porEntidade = new Map<string, LinhaDiaria[]>()
  for (const p of points) {
    const linhas = porEntidade.get(p.entityId) ?? []
    linhas.push({
      date: p.date,
      Negativo: p.sentiment.negative,
      Neutro: p.sentiment.neutral,
      Positivo: p.sentiment.positive,
    })
    porEntidade.set(p.entityId, linhas)
  }

  // Só entra painel de quem tem série; um candidato sem comentário classificado no
  // recorte não vira um quadro vazio no meio da grade.
  const paineis = entities
    .map((entity) => ({ entity, linhas: porEntidade.get(entity.id) ?? [] }))
    .filter((painel) => painel.linhas.length > 0)

  const isEmpty = !loading && !error && paineis.length === 0

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <IconTile icon={TrendingDown} tone="coral" size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Sentimento ao longo do tempo
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Distribuição diária dos comentários · um painel por candidato
          </p>
        </div>
        {!loading && !error && !isEmpty && (
          <div className="flex flex-wrap items-center gap-4">
            {LEGEND.map((item) => (
              <span
                key={item.key}
                className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: sentimentColor(item.key) }}
                />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {error ? (
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
      ) : loading ? (
        <ChartCardSkeleton height={200} />
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhum dado de sentimento neste período"
          description="Sem comentários orgânicos suficientes para calcular sentimento no recorte atual."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 ${paineis.length > 1 ? 'lg:grid-cols-2' : ''}`}
        >
          {paineis.map(({ entity, linhas }) => (
            <div key={entity.id} className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                {entity.name}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={linhas} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--gridline)"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--baseline)' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={renderTooltip} cursor={{ fill: 'var(--gridline)' }} />
                  <Bar
                    dataKey="Negativo"
                    stackId="s"
                    fill={sentimentColor('negative')}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="Neutro"
                    stackId="s"
                    fill={sentimentColor('neutral')}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="Positivo"
                    stackId="s"
                    fill={sentimentColor('positive')}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
