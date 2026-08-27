export interface RegistryCandidate {
  id: string
  name: string
  /** contagem de apelidos/termos cadastrados — só para a lista do modal "Adicionar
   * candidato"; o registro completo (com os termos em si) é dado da API real. */
  apelidos: number
  termos: number
}

/**
 * Registro simulado de entidades cadastráveis (modal "Adicionar candidato"). Só Lula e
 * Flávio Bolsonaro têm dados mockados completos (ver mocks/topics.ts) — os demais
 * entram no filtro e no comparativo, mas aparecem "sem dados" nas outras telas até a
 * coleta real existir (Fase 6).
 */
export const CANDIDATE_REGISTRY: RegistryCandidate[] = [
  { id: 'lula', name: 'Lula', apelidos: 6, termos: 18 },
  { id: 'flavio-bolsonaro', name: 'Flávio Bolsonaro', apelidos: 5, termos: 14 },
  { id: 'simone-tebet', name: 'Simone Tebet', apelidos: 4, termos: 11 },
  { id: 'simao-pedro', name: 'Simão Pedro', apelidos: 2, termos: 5 },
]
