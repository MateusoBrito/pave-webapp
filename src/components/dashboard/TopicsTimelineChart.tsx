import { AlertTriangle, MousePointerClick, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { DotProps } from 'recharts'
import { getTopicCalendar } from '../../api/client'
import type { CandidateSentimentSummary, TopicRankingRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { formatFullDate, formatShortDate, yesterdayIsoDate } from '../../lib/dates'
import { candidateColor, predominantSentiment, sentimentColor } from '../../lib/colors'
import type { Entity, Network, TopicSentiment } from '../../types'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { SentimentBar } from './SentimentBar'

const SENTIMENT_LEGEND: { key: 'negative' | 'neutral' | 'positive'; label: string }[] = [
  { key: 'negative', label: 'Negativo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'positive', label: 'Positivo' },
]

function sentimentPct(sentiment: TopicSentiment, key: 'negative' | 'neutral' | 'positive'): number {
  const total = sentiment.negative + sentiment.neutral + sentiment.positive || 1
  return (sentiment[key] / total) * 100
}

const WINDOW_DAYS = 30

function daysAgoIso(n: number): string {
  const d = new Date(`${yesterdayIsoDate()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (n - 1))
  return d.toISOString().slice(0, 10)
}

interface Props {
  entities: Entity[]
  network: Network
  rankingRows: TopicRankingRow[]
  rankingLoading: boolean
  rankingError?: Error
  /** Sentimento geral do candidato no dia selecionado - "sentimento por candidato" não
   * fazia mais sentido como seção própria depois que a página passou a mostrar um
   * candidato por vez (ver CandidateAvatarFilter singleSelect); vira um resumo
   * compacto aqui, junto do título, no lugar do card grande que existia antes. */
  sentiment: CandidateSentimentSummary[]
}

/** Gráfico de volume por dia + tópicos do dia selecionado ao lado - reaproveita o
 * "ranking de tópicos do período" que a página já busca (escopado ao dia selecionado
 * em `day`), então clicar numa barra só troca o dia e o painel lateral já atualiza
 * sozinho. Substitui o calendário (ver opção C do canvas de design "Histórico de
 * Tópicos" - a opção do calendário ficou apertada demais pra caber o rótulo do
 * tópico). Um candidato por vez - a escolha já é feita lá em cima, no
 * CandidateAvatarFilter (singleSelect nesta página). */
export function TopicsTimelineChart({
  entities,
  network,
  rankingRows,
  rankingLoading,
  rankingError,
  sentiment,
}: Props) {
  const navigate = useNavigate()
  const { candidateIds, day, setDay } = useFilters()
  const activeId = candidateIds[0]
  const activeEntity = entities.find((e) => e.id === activeId)
  const activeSentiment = sentiment.find((s) => s.entity.id === activeId)
  const hasSentiment =
    activeSentiment &&
    activeSentiment.sentiment.negative + activeSentiment.sentiment.neutral + activeSentiment.sentiment.positive > 0

  const period = { from: daysAgoIso(WINDOW_DAYS), to: yesterdayIsoDate() }
  const { data, loading, error, refetch } = useAsync(
    () => (activeId ? getTopicCalendar([activeId], network, period) : Promise.resolve(undefined)),
    [activeId, network],
  )

  const chartData = (data?.entities[0]?.days ?? []).map((d) => ({
    date: d.date,
    // null (não 0) para dias sem modelo carregado - vira um buraco na linha em vez de
    // um ponto falso no chão (ver connectNulls={false} e o dot customizado abaixo).
    mentions: d.mentions ?? null,
    topLabel: d.topLabel,
  }))
  // Só desenha a linha tracejada quando o dia selecionado tem dado de verdade nesta
  // janela - sem isso, o segmento apontaria pra um ponto que não existe no gráfico.
  const selectedPoint = chartData.find((d) => d.date === day && d.mentions != null)
  const lineColor = activeId ? candidateColor(activeId) : 'var(--color-primary)'

  // O dia pré-selecionado (default de FiltersContext é sempre D-1) pode cair num dia
  // sem modelo ainda (ex: modelagem noturna atrasada, ou o candidato trocou e o D-1
  // dele não tem dado) - nesse caso, pula pro dia com dado mais recente automaticamente,
  // em vez de deixar o painel "nenhum tópico neste dia" parado. Só corrige quando o dia
  // atual está vazio - nunca sobrescreve um dia que o usuário clicou de propósito (só é
  // possível clicar em dias com dado, o dot não existe pra dias vazios).
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
              Volume por dia{activeEntity ? ` · ${activeEntity.name}` : ''}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Clique num ponto para ver os tópicos daquele dia
            </p>
          </div>
        </div>

        {hasSentiment && activeSentiment && (
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-[0.3px] text-[var(--text-muted)] uppercase">
              Sentimento geral
            </p>
            <SentimentBar sentiment={activeSentiment.sentiment} size="md" />
            <div className="flex gap-3">
              {SENTIMENT_LEGEND.map(({ key, label }) => {
                const pct = sentimentPct(activeSentiment.sentiment, key)
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: sentimentColor(key) }}
                    />
                    {label} {pct.toFixed(0)}%
                  </span>
                )
              })}
            </div>
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
                    value: 'Menções',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: 'var(--text-muted)', textAnchor: 'middle' },
                  }}
                />
                {selectedPoint && (
                  <ReferenceLine
                    segment={[
                      { x: day, y: selectedPoint.mentions },
                      { x: day, y: 0 },
                    ]}
                    stroke={lineColor}
                    strokeDasharray="3 3"
                  />
                )}
                <Line
                  type="linear"
                  dataKey="mentions"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  connectNulls={false}
                  dot={(props: DotProps & { payload?: { date: string; mentions: number | null } }) => {
                    const { cx, cy, payload, key } = props
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
                        fill={isSelected ? lineColor : '#ffffff'}
                        stroke={lineColor}
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
              Volume do tópico de maior destaque em cada dia
            </p>
          </div>

          <div className="hidden w-px bg-[var(--gridline)] lg:block" />

          <div className="flex flex-1 flex-col gap-3">
            <div>
              <span className="text-[11px] font-bold tracking-[0.3px] text-[var(--color-primary-dark)] uppercase">
                {formatFullDate(day)}
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">Tópicos deste dia</p>
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
                description="Esse candidato não teve documentos suficientes nesse dia para gerar tópicos."
              />
            ) : (
              <ol className="flex max-h-[370px] flex-col gap-2 overflow-y-auto pr-1">
                {rankingRows.map((row) => {
                  return (
                    <li key={row.topic.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/topicos/${row.topic.id}`)}
                        className="flex w-full flex-col gap-1.5 rounded-xl border border-[var(--gridline)] px-3 py-2 text-left hover:bg-black/5"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                            {row.topic.label}
                          </span>
                          <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">
                            {row.mentions.toLocaleString('pt-BR')}
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {SENTIMENT_LEGEND.map(({ key, label }) => {
                            const isPredominant = predominantSentiment(row.sentiment).label === key
                            return (
                              <span
                                key={key}
                                className="flex items-center gap-1 text-[10px]"
                                style={{
                                  color: isPredominant ? sentimentColor(key) : 'var(--text-secondary)',
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: sentimentColor(key) }}
                                />
                                {label} {sentimentPct(row.sentiment, key).toFixed(0)}%
                              </span>
                            )
                          })}
                        </span>
                      </button>
                    </li>
                  )
                })}
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
