import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Network } from '../types'
import type { PeriodFilter } from '../api/client'
import { lastNDaysPeriod } from '../lib/dates'

const DEFAULT_DAYS = 30

export interface FiltersValue {
  /** [] = todos os candidatos — mesmo contrato "vazio = todos" usado em api/client.ts */
  candidateIds: string[]
  /** [] = todas as redes */
  networks: Network[]
  days: number
  period: PeriodFilter
  topicId: string | undefined
  setCandidateIds: (ids: string[]) => void
  setNetworks: (networks: Network[]) => void
  setDays: (days: number) => void
  setTopicId: (id: string | undefined) => void
  clearFilters: () => void
}

const FiltersContext = createContext<FiltersValue | undefined>(undefined)

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const candidateIds = useMemo(
    () => parseList(searchParams.get('candidates')),
    [searchParams],
  )
  const networks = useMemo(
    () => parseList(searchParams.get('networks')) as Network[],
    [searchParams],
  )
  const days = Number(searchParams.get('days')) || DEFAULT_DAYS
  const topicId = searchParams.get('topic') ?? undefined
  const period = useMemo(() => lastNDaysPeriod(days), [days])

  function update(patch: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  const value: FiltersValue = {
    candidateIds,
    networks,
    days,
    period,
    topicId,
    setCandidateIds: (ids) => update({ candidates: ids.join(',') || null }),
    setNetworks: (nets) => update({ networks: nets.join(',') || null }),
    setDays: (d) => update({ days: d === DEFAULT_DAYS ? null : String(d) }),
    setTopicId: (id) => update({ topic: id ?? null }),
    clearFilters: () => setSearchParams(new URLSearchParams(), { replace: true }),
  }

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters(): FiltersValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}
