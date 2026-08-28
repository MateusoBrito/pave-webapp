import type { TopicRankingRow } from '../api/client'
import type { Entity, Network } from '../types'
import { NETWORKS } from '../types'

const NETWORK_LABEL: Record<Network, string> = Object.fromEntries(
  NETWORKS.map((n) => [n.id, n.label]),
) as Record<Network, string>

function csvEscape(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Ponto e vírgula como separador (não vírgula) — Excel em pt-BR usa vírgula como
 * separador decimal, então CSV "de verdade" nesse locale usa `;` entre campos. */
export function buildTopicRankingCsv(
  rows: TopicRankingRow[],
  entities: Entity[],
): string {
  const header = [
    'Tópico',
    'Candidato',
    'Rede dominante',
    'Menções',
    'Variação vs. período anterior (%)',
    'Sentimento negativo',
    'Sentimento neutro',
    'Sentimento positivo',
  ]
  const lines = [header.map(csvEscape).join(';')]

  for (const row of rows) {
    const entity = entities.find((e) => e.id === row.topic.entityId)
    lines.push(
      [
        row.topic.label,
        entity?.name ?? row.topic.entityId,
        NETWORK_LABEL[row.dominantNetwork],
        String(row.mentions),
        row.variationPct.toFixed(1).replace('.', ','),
        String(row.sentiment.negative),
        String(row.sentiment.neutral),
        String(row.sentiment.positive),
      ]
        .map(csvEscape)
        .join(';'),
    )
  }

  return lines.join('\r\n')
}

/** Dispara um download real no navegador — funciona porque este é o app de verdade,
 * não uma prévia sandboxed. BOM UTF-8 no início pra abrir com acentos corretos no
 * Excel em pt-BR. Retorna o tamanho em bytes do arquivo gerado. */
const UTF8_BOM = '﻿'

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): number {
  const blob = new Blob([UTF8_BOM + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return blob.size
}
