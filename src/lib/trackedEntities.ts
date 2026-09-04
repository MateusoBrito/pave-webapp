const STORAGE_KEY = 'pave:trackedEntityIds'

function readStoredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeStoredIds(ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

let trackedIds = readStoredIds()

export function getTrackedEntityIds(): string[] {
  return trackedIds
}

export function addTrackedEntityIds(ids: string[]): void {
  trackedIds = Array.from(new Set([...trackedIds, ...ids]))
  writeStoredIds(trackedIds)
}

export function removeTrackedEntityId(id: string): void {
  trackedIds = trackedIds.filter((existing) => existing !== id)
  writeStoredIds(trackedIds)
}
