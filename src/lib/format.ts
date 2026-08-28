export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

export function formatSignedPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')}%`
}

export function formatBRLCompact(n: number): string {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (n >= 1_000) return `R$ ${Math.round(n / 1000)} mil`
  return `R$ ${n.toLocaleString('pt-BR')}`
}

/** Faixa declarada pela Ad Library — "R$ X mil – Y mil" (ver Metodologia). */
export function formatBRLRange(min: number, max: number): string {
  return `${formatBRLCompact(min)} – ${formatBRLCompact(max).replace('R$ ', '')}`
}

/** "Flávio Bolsonaro" -> "Flávio B." — usado pra desambiguar tópicos entre candidatos
 * em listas compactas (ranking, heatmaps) sem estourar a largura da coluna. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/** "Visão Geral" -> "visao-geral" — usado em nome de arquivo e domínio sintético. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
