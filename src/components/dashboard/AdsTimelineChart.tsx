import { AlertTriangle, MousePointerClick, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { getTopicCalendar } from '../../api/client'
import type { AdTopicRankingRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { formatFullDate, formatShortDate, yesterdayIsoDate } from '../../lib/dates'
import { formatBRLRange } from '../../lib/format'
import type { Entity } from '../../types'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const WINDOW_DAYS = 30

function daysAgoIso(n: number): string {
  const d = new Date(`${yesterdayIsoDate()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (n - 1))
  return d.toISOString().slice(0, 10)
}

interface Props {
  entities: Entity[]
  rankingRows: AdTopicRankingRow[]
  rankingLoading: boolean
  rankingError?: Error
}

/** Análogo ao TopicsTimelineChart de "O que os usuários comentam?": gráfico de
 * volume por dia (aqui, tamanho do tópico de anúncio de maior destaque) + tópicos de
 * anúncio do dia selecionado ao lado, com investimento no lugar de menções/sentimento
 * - anúncio pago não tem reação pública coletável (mesma nota já usada em
 * AdTopicDrilldownPage). Reaproveita o mesmo /topics/calendar (fonte_codigo='meta' é
 * só mais uma rede pro schema diário de tópicos). Um candidato por vez - a escolha já
 * é feita lá em cima, no CandidateAvatarFilter (singleSelect nesta página). */
export function AdsTimelineChart({ entities, rankingRows, rankingLoading, rankingError }: Props) {
  const navigate = useNavigate()
  const { candidateIds, day, setDay } = useFilters()
  const activeId = candidateIds[0]
  const activeEntity = entities.find((e) => e.id === activeId)

  const totalInvestment = rankingRows.reduce(
    (acc, row) => ({
      min: acc.min + row.investmentMinBRL,
      max: acc.max + row.investmentMaxBRL,
    }),
    { min: 0, max: 0 },
  )
  const hasInvestment = rankingRows.length > 0

  const period = { from: daysAgoIso(WINDOW_DAYS), to: yesterdayIsoDate() }
  const { data, loading, error, refetch } = useAsync(
    () => (activeId ? getTopicCalendar([activeId], 'meta_ads', period) : Promise.resolve(undefined)),
    [activeId],
  )

  const chartData = (data?.entities[0]?.days ?? []).map((d) => ({
    date: d.date,
    mentions: d.mentions ?? null,
    topLabel: d.topLabel,
  }))
  const selectedPoint = chartData.find((d) => d.date === day && d.mentions != null)

  // Mesmo ajuste do TopicsTimelineChart: se o dia pré-selecionado (default D-1) não
  // tem anúncio nenhum ainda, pula pro dia com dado mais recente automaticamente, em
  // vez de deixar o painel vazio parado. Só corrige quando o dia atual está vazio -
  // nunca sobrescreve um clique real do usuário (só dá pra clicar em dias com dado).
  useEffect(() => {
    if (loading || error || chartData.length === 0 || selectedPoint) return
    const maisRecenteComDado = [...chartData].reverse().find((d) => d.mentions != null)
    if (maisRecenteComDado && maisRecenteComDado.date !== day) {
      setDay(maisRecenteComDado.date)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, chartData, selectedPoint, day])

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-[13px]">
          <IconTile icon={TrendingUp} tone="coral" size={34} />
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Volume de anúncios por dia{activeEntity ? ` · ${activeEntity.name}` : ''}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Clique num ponto para ver os tópicos de anúncio daquele dia
            </p>
          </div>
        </div>

        {hasInvestment && (
          <div className="flex min-w-[180px] flex-col gap-1">
            <p className="text-[10px] font-bold tracking-[0.3px] text-[var(--text-muted)] uppercase">
              Investimento no dia
            </p>
            <p className="text-[18px] font-bold text-[var(--text-primary)]">
              {formatBRLRange(totalInvestment.min, totalInvestment.max)}
            </p>
          </div>
        )}
      </div>

      {error ? (
        <StatusCard
          icon={AlertTriangle}
          tone="coral"
          title="Não foi possível carregar"
          description="Falha ao consultar a API. Seus filtros foram mantidos — é só tentar de novo."
          primaryAction={refetch ? { label: 'Tentar novamente', onClick: refetch } : undefined}
        />
      ) : loading || !activeId ? (
        <ChartCardSkeleton />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-[1.4]">
            <ResponsiveContainer width="100%" height={440}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--gridline)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--baseline)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Anúncios',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: 'var(--text-muted)', textAnchor: 'middle' },
                  }}
                />
                {selectedPoint?.mentions != null && (
                  <ReferenceLine
                    segment={[
                      { x: day, y: selectedPoint.mentions },
                      { x: day, y: 0 },
                    ]}
                    stroke="var(--color-primary)"
                    strokeDasharray="3 3"
                  />
                )}
                <Line
                  type="linear"
                  dataKey="mentions"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  connectNulls={false}
                  dot={(props) => {
                    // Sem anotar `props`: o recharts 3.x passa DotItemDotProps aqui, e
                    // tipar como DotProps não compila (o campo `points` diverge). Deixar
                    // o contextual typing inferir e só estreitar o payload, que é nosso.
                    const { cx, cy, key } = props
                    const payload = props.payload as
                      | { date: string; mentions: number | null }
                      | undefined
                    if (cx == null || cy == null || !payload || payload.mentions == null) {
                      return <g key={key} />
                    }
                    const isSelected = payload.date === day
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? 'var(--color-primary)' : '#ffffff'}
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        className="cursor-pointer"
                        onClick={() => setDay(payload.date)}
                      />
                    )
                  }}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-[11px] text-[var(--text-muted)]">
              Volume do tópico de anúncio de maior destaque em cada dia
            </p>
          </div>

          <div className="hidden w-px bg-[var(--gridline)] lg:block" />

          <div className="flex flex-1 flex-col gap-3">
            <div>
              <span className="text-[11px] font-bold tracking-[0.3px] text-[var(--color-primary-dark)] uppercase">
                {formatFullDate(day)}
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">Tópicos de anúncio deste dia</p>
            </div>

            {rankingError ? (
              <StatusCard
                icon={AlertTriangle}
                tone="coral"
                title="Não foi possível carregar"
                description="Falha ao consultar os tópicos deste dia."
              />
            ) : rankingLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-[var(--gridline)]" />
                ))}
              </div>
            ) : rankingRows.length === 0 ? (
              <StatusCard
                icon={TrendingUp}
                tone="graphite"
                title="Nenhum tópico neste dia"
                description="Esse candidato não veiculou anúncios suficientes nesse dia para gerar tópicos."
              />
            ) : (
              <ol className="flex max-h-[370px] flex-col gap-2 overflow-y-auto pr-1">
                {rankingRows.map((row) => (
                  <li key={row.topic.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/anuncios/${row.topic.id}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--gridline)] px-3 py-2 text-left hover:bg-black/5"
                    >
                      <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {row.topic.label}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">
                        {formatBRLRange(row.investmentMinBRL, row.investmentMaxBRL)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {!rankingLoading && rankingRows.length > 0 && (
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-primary)]">
                <MousePointerClick size={12} />
                Clique num tópico para abrir o detalhamento
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
