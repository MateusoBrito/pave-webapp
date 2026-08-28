import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Download, Search, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CandidateTopicListResult } from '../../api/client'
import { getCandidateTopicList } from '../../api/client'
import type { PeriodFilter } from '../../api/client'
import { buildTopicRankingCsv, downloadTextFile } from '../../lib/csvExport'
import {
  candidateColor,
  networkColor,
  networkTint,
  sentimentColor,
} from '../../lib/colors'
import { formatDateRange } from '../../lib/dates'
import { slugify } from '../../lib/format'
import type { Network } from '../../types'
import { NETWORKS } from '../../types'
import { Avatar } from '../ui/Avatar'
import { FOCUS_RING } from '../ui/focusRing'
import { Modal } from '../ui/Modal'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const PAGE_SIZE = 10

type Filter = 'all' | 'emerging' | 'declining'

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todos',
  emerging: 'Emergentes',
  declining: 'Em queda',
}

interface Props {
  open: boolean
  onClose: () => void
  entityId: string
  network: Network
  period: PeriodFilter
}

/** "Todos os tópicos do candidato" — busca, filtro, ordenação e paginação em cima do
 * mesmo dataset do ranking (getTopicRanking), escopado a um candidato + uma rede.
 * Aberto a partir de "Ver todos os tópicos deste candidato" no Comparativo. */
export function CandidateTopicsModal({
  open,
  onClose,
  entityId,
  network,
  period,
}: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<'mentions' | 'alpha'>('mentions')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [data, setData] = useState<CandidateTopicListResult>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    if (!open) {
      setSearch('')
      setFilter('all')
      setSort('mentions')
      setLimit(PAGE_SIZE)
      setData(undefined)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    getCandidateTopicList({ entityId, network, period, search, filter, sort, limit })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, entityId, network, period, search, filter, sort, limit])

  if (!open) return null

  const color = data?.entity ? candidateColor(data.entity.id) : 'var(--color-primary)'
  const networkLabel = NETWORKS.find((n) => n.id === network)?.label ?? network
  const maxMentions = Math.max(...(data?.rows.map((r) => r.mentions) ?? []), 1)
  const remainingCount = data ? data.totalFiltered - data.rows.length : 0

  function handleSeeDetails(topicId: string) {
    onClose()
    navigate(`/topicos/${topicId}`, { state: { from: '/comparativo' } })
  }

  async function handleExport() {
    if (!data?.entity) return
    const full = await getCandidateTopicList({
      entityId,
      network,
      period,
      search,
      filter,
      sort,
    })
    const csv = buildTopicRankingCsv(full.rows, [data.entity])
    const filename = `pave_topicos_${slugify(data.entity.name)}_${period.from}_a_${period.to}.csv`
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8;')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={
        data?.entity ? `Todos os tópicos de ${data.entity.name}` : 'Todos os tópicos'
      }
      size="lg"
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {data?.entity && (
            <Avatar
              name={data.entity.name}
              color={color}
              size={46}
              photoUrl={data.entity.photoUrl}
            />
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[21px] font-bold text-[var(--text-primary)]">
                Todos os tópicos de {data?.entity?.name ?? '…'}
              </h2>
              <span
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold"
                style={{
                  backgroundColor: networkTint(network),
                  color: networkColor(network),
                }}
              >
                {networkLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {data
                ? `${data.totalTopics} tópicos · ${data.totalMentions.toLocaleString('pt-BR')} menções · ${formatDateRange(period)}`
                : 'Carregando…'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`shrink-0 rounded-[10px] bg-[var(--gridline)] p-2.5 text-[var(--text-secondary)] hover:bg-black/10 ${FOCUS_RING}`}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2.5">
        <label className="flex w-full max-w-[330px] items-center gap-2.5 rounded-xl border border-[var(--baseline)] px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder="Buscar tópico ou palavra-chave"
            className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
        <div className="flex items-center gap-1.5">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key)
                setLimit(PAGE_SIZE)
              }}
              className={`rounded-[9px] px-3 py-2 text-[11px] font-semibold transition-colors ${FOCUS_RING} ${
                filter === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--gridline)] text-[var(--text-secondary)] hover:brightness-95'
              }`}
            >
              {FILTER_LABEL[key]}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <label className="relative flex items-center gap-1.5 rounded-[10px] border border-[var(--baseline)] px-3 py-2.5 text-[11px] font-semibold text-[var(--text-secondary)]">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as 'mentions' | 'alpha')}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            aria-label="Ordenar tópicos"
          >
            <option value="mentions">Mais menções</option>
            <option value="alpha">A–Z</option>
          </select>
          {sort === 'mentions' ? 'Mais menções' : 'A–Z'}
          <ChevronDown size={12} className="text-[var(--text-muted)]" />
        </label>
      </div>

      <div className="w-full">
        {error ? (
          <StatusCard
            icon={Search}
            tone="coral"
            title="Não foi possível carregar"
            description="Falha ao consultar a API. Tente de novo."
            primaryAction={{
              label: 'Tentar novamente',
              onClick: () => setLimit((l) => l),
            }}
          />
        ) : !data ? (
          <TableCardSkeleton rows={6} />
        ) : data.rows.length === 0 ? (
          <StatusCard
            icon={Search}
            tone="purple"
            title="Nenhum tópico encontrado"
            description="Nenhum tópico bate com essa busca ou filtro."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="rounded-lg bg-[var(--page-plane)] text-[9px] font-bold tracking-[0.7px] text-[var(--text-muted)] uppercase">
                  <th className="w-8 px-3.5 py-2.5">#</th>
                  <th className="px-1 py-2.5">Tópico</th>
                  <th className="w-32 px-1 py-2.5">Volume</th>
                  <th className="w-20 px-1 py-2.5">Menções</th>
                  <th className="w-16 px-1 py-2.5">Share</th>
                  <th className="w-40 px-1 py-2.5">Sentimento</th>
                  <th className="w-24 px-1 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => {
                  const total =
                    row.sentiment.negative +
                      row.sentiment.neutral +
                      row.sentiment.positive || 1
                  const negativePct = Math.round((row.sentiment.negative / total) * 100)
                  return (
                    <tr
                      key={row.topic.id}
                      className={`border-b border-[var(--gridline)] last:border-0 ${
                        index === 0 ? 'rounded-lg bg-[var(--tint-primary)]' : ''
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-[10px] font-bold text-[var(--text-muted)]">
                        {index + 1}
                      </td>
                      <td className="px-1 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap text-[var(--text-primary)]">
                            {row.topic.label}
                          </span>
                          {row.topic.emergent && (
                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--tint-amber)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--tint-text-amber)]">
                              <Sparkles size={9} />
                              emergente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-2.5">
                        <span className="block h-[9px] w-full max-w-[116px] overflow-hidden rounded-[5px] bg-[var(--gridline)]">
                          <span
                            className="block h-full rounded-[5px]"
                            style={{
                              width: `${(row.mentions / maxMentions) * 100}%`,
                              backgroundColor: 'var(--color-primary)',
                            }}
                          />
                        </span>
                      </td>
                      <td className="px-1 py-2.5 text-xs font-semibold text-[var(--text-primary)]">
                        {row.mentions.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-1 py-2.5 text-[11px] text-[var(--text-secondary)]">
                        {row.sharePct.toFixed(1).replace('.', ',')}%
                      </td>
                      <td className="px-1 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-[9px] w-[118px] overflow-hidden rounded-[5px]">
                            {(
                              [
                                ['negative', row.sentiment.negative],
                                ['neutral', row.sentiment.neutral],
                                ['positive', row.sentiment.positive],
                              ] as const
                            ).map(([key, value]) =>
                              value > 0 ? (
                                <span
                                  key={key}
                                  style={{
                                    width: `${(value / total) * 100}%`,
                                    backgroundColor: sentimentColor(key),
                                  }}
                                />
                              ) : null,
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--color-coral)]">
                            {negativePct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-1 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleSeeDetails(row.topic.id)}
                          className={`inline-flex items-center gap-1 rounded-[9px] bg-[var(--tint-primary)] py-1.5 pr-2.5 pl-3 text-[10px] font-semibold text-[var(--color-primary-dark)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
                        >
                          Ver detalhes
                          <ChevronRight size={11} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.rows.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-[var(--text-muted)]">
            Mostrando {data.rows.length} de {data.totalFiltered} tópicos
            {remainingCount > 0 &&
              ` · os ${remainingCount} restantes somam ${data.remainingMentions.toLocaleString('pt-BR')} menções`}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex items-center gap-1.5 rounded-[10px] border border-[var(--baseline)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.02] ${FOCUS_RING}`}
            >
              <Download size={13} />
              Exportar lista
            </button>
            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                disabled={loading}
                className={`rounded-[10px] bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60 ${FOCUS_RING}`}
              >
                Carregar mais {Math.min(PAGE_SIZE, remainingCount)} tópicos
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
