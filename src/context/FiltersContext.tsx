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
  setCandidateIds: (ids: string[]) => void
  setNetworks: (networks: Network[]) => void
  setDays: (days: number) => void
  clearFilters: () => void
}

const FiltersContext = createContext<FiltersValue | undefined>(undefined)

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

/**
 * Cache de sessão dos filtros — a URL continua sendo a fonte "ao vivo" (permite link
 * compartilhável/favoritado com filtro aplicado), mas os links da sidebar trocam de
 * tela com um path puro, sem querystring. Sem isso, escolher um candidato/rede/período
 * e navegar para outra aba resetava tudo. sessionStorage garante que o filtro
 * "continua" ao trocar de tela na mesma aba, e volta ao padrão se a aba for fechada.
 */
const STORAGE_KEY = 'pave:filters'

interface StoredFilters {
  candidates?: string
  networks?: string
  days?: string
}

function readStored(): StoredFilters {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredFilters) : {}
  } catch {
    return {}
  }
}

function writeStored(patch: Record<string, string | null>): void {
  try {
    const current = readStored()
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') delete current[key as keyof StoredFilters]
      else current[key as keyof StoredFilters] = value
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // sessionStorage indisponível (modo privado etc.) — segue só na URL desta navegação
  }
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const candidateIds = useMemo(
    () => parseList(searchParams.get('candidates') ?? readStored().candidates ?? null),
    [searchParams],
  )
  const networks = useMemo(
    () =>
      parseList(
        searchParams.get('networks') ?? readStored().networks ?? null,
      ) as Network[],
    [searchParams],
  )
  const days = Number(searchParams.get('days') ?? readStored().days) || DEFAULT_DAYS
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
    writeStored(patch)
  }

  const value: FiltersValue = {
    candidateIds,
    networks,
    days,
    period,
    setCandidateIds: (ids) => update({ candidates: ids.join(',') || null }),
    setNetworks: (nets) => update({ networks: nets.join(',') || null }),
    setDays: (d) => update({ days: d === DEFAULT_DAYS ? null : String(d) }),
    clearFilters: () => {
      setSearchParams(new URLSearchParams(), { replace: true })
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // sessionStorage indisponível — nada para limpar
      }
    },
  }

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters(): FiltersValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}
