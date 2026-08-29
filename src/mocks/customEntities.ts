import type { Entity } from '../types'
import { CANDIDATE_REGISTRY } from './candidateRegistry'

const STORAGE_KEY = 'pave:customEntityIds'

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
  } catch {
    // sessionStorage indisponível (modo privado etc.) — segue só em memória nesta aba
  }
}

let customEntityIds = readStoredIds()

function toEntity(id: string): Entity | undefined {
  const candidate = CANDIDATE_REGISTRY.find((c) => c.id === id)
  if (!candidate) return undefined
  return {
    id: candidate.id,
    name: candidate.name,
    role: 'Cadastrado no registro',
    aliases: [candidate.name],
  }
}

/**
 * Candidatos que o usuário adicionou nesta sessão (modal "Adicionar candidato" — ver
 * components/filters/AddCandidateModal.tsx). Persistem entre navegações de tela via
 * sessionStorage, mas voltam ao padrão (só Lula e Flávio) se a aba for fechada — o
 * registro de verdade, persistente entre sessões, só existe quando a API real entrar.
 */
export function getCustomEntities(): Entity[] {
  return customEntityIds.map(toEntity).filter((e): e is Entity => Boolean(e))
}

export function addCustomEntityIds(ids: string[]): void {
  customEntityIds = Array.from(new Set([...customEntityIds, ...ids]))
  writeStoredIds(customEntityIds)
}

/** Tira um candidato adicionado nesta sessão do acompanhamento — só se aplica a
 * quem entrou pelo "Adicionar candidato"; Lula e Flávio (registro fixo) não passam
 * por aqui. */
export function removeCustomEntityId(id: string): void {
  customEntityIds = customEntityIds.filter((existing) => existing !== id)
  writeStoredIds(customEntityIds)
}
