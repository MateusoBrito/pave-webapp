import { auth } from '../lib/firebase'
import type { Network } from '../types'
import type { PeriodFilter } from './client'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function waitForAuth(): Promise<void> {
  if (auth.currentUser) return Promise.resolve()
  return new Promise((resolve) => {
    let fired = false
    let unsubscribe: (() => void) | undefined
    unsubscribe = auth.onAuthStateChanged(() => {
      fired = true
      unsubscribe?.()
      resolve()
    })
    if (fired) unsubscribe()
  })
}

async function authHeader(): Promise<Record<string, string>> {
  await waitForAuth()
  const user = auth.currentUser
  if (!user) return {}
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` }
  } catch {
    return {}
  }
}

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function apiGet<T>(path: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
    headers: { Accept: 'application/json', ...(await authHeader()) },
  })

  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {}
    throw new ApiError(detail || String(response.status), response.status)
  }

  return (await response.json()) as T
}

export async function apiGetOptional<T>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T | undefined> {
  try {
    return await apiGet<T>(path, params)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined
    throw err
  }
}

export function periodParams(period: PeriodFilter) {
  return { from: period.from, to: period.to }
}

export function networkParams(networks: Network[]) {
  return { networks }
}
