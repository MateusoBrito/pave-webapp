import type { Entity } from '../types'

/**
 * Escopo v1 do plano: Lula + Flávio Bolsonaro, cadastrados via config (não hardcoded
 * em componentes). Novas entidades entram aqui — ou, quando a API existir, no registro
 * de entidades do backend — sem qualquer mudança no restante do app.
 */
export const ENTITIES: Entity[] = [
  {
    id: 'lula',
    name: 'Lula',
    role: 'Presidente, candidato à reeleição',
    aliases: ['Lula', 'Luiz Inácio', 'Lula da Silva', 'presidente Lula'],
  },
  {
    id: 'flavio-bolsonaro',
    name: 'Flávio Bolsonaro',
    role: 'Senador',
    aliases: ['Flávio Bolsonaro', 'senador Flávio'],
  },
]
