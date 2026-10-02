export interface GrupoDeRanking<T> {
  entityId: string
  /** as linhas do candidato, já cortadas em `porEntidade` e na ordem que chegaram */
  rows: T[]
  /** soma de menções de TODAS as linhas do candidato, não só das exibidas */
  total: number
}

/** Agrupa um ranking por candidato, em vez de cortar a lista pelo topo.
 *
 * Volume absoluto não é comparável entre candidatos: medido em 10/08–09/09, as dez
 * primeiras linhas eram todas do Lula (2.635 a 757 menções), enquanto o melhor tópico do
 * Augusto Cury tinha 136. Cortar em dez deixava três dos quatro selecionados fora da tela.
 *
 * Cada candidato vira um grupo com os seus `porEntidade` tópicos mais falados. Os grupos
 * saem ordenados pelo total de menções do candidato — quem domina a conversa aparece
 * primeiro, mas não ocupa a lista inteira. Dentro do grupo, a ordem que veio (por menções)
 * é preservada.
 */
export function agruparPorEntidade<T>(
  rows: T[],
  entityOf: (row: T) => string,
  mentionsOf: (row: T) => number,
  porEntidade: number,
): GrupoDeRanking<T>[] {
  if (porEntidade <= 0) return []

  const grupos = new Map<string, GrupoDeRanking<T>>()
  for (const row of rows) {
    const entityId = entityOf(row)
    const grupo = grupos.get(entityId) ?? { entityId, rows: [], total: 0 }
    // O total soma tudo, mas só as `porEntidade` primeiras linhas são exibidas: o
    // cabeçalho do grupo precisa dizer o peso real do candidato, não o das 3 que couberam.
    grupo.total += mentionsOf(row)
    if (grupo.rows.length < porEntidade) grupo.rows.push(row)
    grupos.set(entityId, grupo)
  }

  return [...grupos.values()].sort((a, b) => b.total - a.total)
}
