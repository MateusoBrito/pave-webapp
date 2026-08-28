import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  Table,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getEntities, getTopicRanking } from '../../api/client'
import type { PeriodFilter } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'
import { buildTopicRankingCsv, downloadTextFile } from '../../lib/csvExport'
import { formatDateRange } from '../../lib/dates'
import { slugify } from '../../lib/format'
import { NETWORKS } from '../../types'
import type { Network } from '../../types'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile, type IconTone } from '../ui/IconTile'
import { Modal } from '../ui/Modal'

type What = 'screen' | 'chart' | 'full'
type Format = 'csv' | 'xlsx' | 'png' | 'pdf'
type Step = 'options' | 'preparing' | 'ready' | 'error'

const WHAT_OPTIONS: { value: What; title: string; body: string }[] = [
  {
    value: 'screen',
    title: 'Dados desta tela',
    body: 'As séries e tabelas que você está vendo, já filtradas',
  },
  {
    value: 'chart',
    title: 'Apenas um gráfico',
    body: 'Escolha qual gráfico depois de selecionar o formato',
  },
  {
    value: 'full',
    title: 'Base completa do período',
    body: 'Todos os documentos coletados, sem os filtros da tela',
  },
]

const FORMAT_OPTIONS: {
  value: Format
  label: string
  body: string
  icon: LucideIcon
  tone: IconTone
}[] = [
  {
    value: 'csv',
    label: 'CSV',
    body: 'Dados brutos para análise',
    icon: Table,
    tone: 'purple',
  },
  {
    value: 'xlsx',
    label: 'XLSX',
    body: 'Planilha com uma aba por painel',
    icon: FileSpreadsheet,
    tone: 'green',
  },
  {
    value: 'png',
    label: 'PNG',
    body: 'Imagem do gráfico para apresentação',
    icon: ImageIcon,
    tone: 'amber',
  },
  {
    value: 'pdf',
    label: 'PDF',
    body: 'Relatório da tela com metodologia',
    icon: FileText,
    tone: 'coral',
  },
]

const NETWORK_LABEL: Record<Network, string> = Object.fromEntries(
  NETWORKS.map((n) => [n.id, n.label]),
) as Record<Network, string>

function daysBetween(period: PeriodFilter): number {
  const from = new Date(`${period.from}T00:00:00Z`).getTime()
  const to = new Date(`${period.to}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000) + 1
}

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`
  return `${kb.toFixed(1).replace('.', ',')} KB`
}

interface Props {
  open: boolean
  onClose: () => void
  /** título da tela atual (TopBar) — vira contexto do export e nome do arquivo */
  pageTitle: string
}

/** Modal "Exportar" — só o par "Dados desta tela" + CSV gera de verdade (baixa um CSV
 * real com os dados filtrados que estão na tela); as outras combinações ficam
 * visíveis, no estilo do resto do app, mas desabilitadas com dica explicando que ainda
 * não existem (XLSX/PNG/PDF exigiriam geração no servidor — Fase 3). O estado de erro
 * é alcançável de verdade: período de 90 dias + "incluir trechos" simula timeout,
 * igual ao texto do próprio aviso sugere. */
export function ExportModal({ open, onClose, pageTitle }: Props) {
  const { candidateIds, networks, period } = useFilters()
  const [what, setWhat] = useState<What>('screen')
  const [format, setFormat] = useState<Format>('csv')
  const [includeMethodology, setIncludeMethodology] = useState(true)
  const [includeExcerpts, setIncludeExcerpts] = useState(true)
  const [step, setStep] = useState<Step>('options')
  const [progress, setProgress] = useState(0)
  const [fileInfo, setFileInfo] = useState<{
    name: string
    sizeLabel: string
    csv: string
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { data: entities = [] } = useAsync(
    () => (open ? getEntities() : Promise.resolve([])),
    [open],
  )
  const { data: ranking = [] } = useAsync(
    () => (open ? getTopicRanking(candidateIds, period, networks) : Promise.resolve([])),
    [open, candidateIds.join(','), period.from, period.to, networks.join(',')],
  )

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => {
    if (!open) {
      clearTimers()
      setWhat('screen')
      setFormat('csv')
      setIncludeMethodology(true)
      setIncludeExcerpts(true)
      setStep('options')
      setProgress(0)
      setFileInfo(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => clearTimers, [])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const selectedEntities =
    candidateIds.length > 0
      ? entities.filter((e) => candidateIds.includes(e.id))
      : entities
  const candidatesLabel =
    candidateIds.length === 0 || selectedEntities.length === 0
      ? 'Todos os candidatos'
      : selectedEntities.map((e) => e.name).join(' e ')
  const networksLabel =
    networks.length === 0
      ? 'Todas as redes'
      : networks.map((id) => NETWORK_LABEL[id]).join(' e ')

  const totalMentions = ranking.reduce((sum, r) => sum + r.mentions, 0)
  const days = daysBetween(period)
  const canExport = what === 'screen' && format === 'csv'
  const willTimeout = days > 60 && includeExcerpts

  const previewCsv = useMemo(
    () => buildTopicRankingCsv(ranking, entities),
    [ranking, entities],
  )
  const previewSizeLabel = formatFileSize(new Blob([previewCsv]).size)

  function runExport() {
    setStep('preparing')
    setProgress(8)
    timerRef.current = setInterval(() => {
      setProgress((p) => Math.min(92, p + 10 + Math.random() * 8))
    }, 160)

    timeoutRef.current = setTimeout(() => {
      clearTimers()
      setProgress(100)
      if (willTimeout) {
        setStep('error')
        return
      }
      const csv = buildTopicRankingCsv(ranking, entities)
      const name = `pave_${slugify(pageTitle)}_${period.from}_a_${period.to}.csv`
      setFileInfo({ name, sizeLabel: formatFileSize(new Blob([csv]).size), csv })
      setStep('ready')
    }, 1200)
  }

  function handleDownload() {
    if (!fileInfo) return
    downloadTextFile(fileInfo.name, fileInfo.csv, 'text/csv;charset=utf-8;')
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Exportar">
      {step === 'options' && (
        <>
          <div className="flex w-full items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
                Exportar
              </h2>
              <p className="mt-[5px] text-xs text-[var(--text-secondary)]">
                O arquivo respeita exatamente os filtros que estão aplicados agora.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className={`shrink-0 rounded-[10px] bg-[var(--gridline)] p-2.5 text-[var(--text-secondary)] hover:bg-black/10 ${FOCUS_RING}`}
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex w-full flex-wrap gap-2 rounded-xl border border-[var(--tint-primary)] bg-[var(--tint-primary)]/40 p-3.5">
            {[
              pageTitle,
              formatDateRange(period),
              candidatesLabel,
              networksLabel,
              'Todos os assuntos',
            ].map((label) => (
              <span
                key={label}
                className="rounded-md border border-[var(--tint-primary)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-dark)]"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[9px] font-bold tracking-[0.9px] text-[var(--text-muted)] uppercase">
              O que exportar
            </p>
            <div
              role="radiogroup"
              aria-label="O que exportar"
              className="flex flex-col gap-2.5"
            >
              {WHAT_OPTIONS.map((option) => {
                const active = what === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setWhat(option.value)}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${FOCUS_RING} ${
                      active
                        ? 'border-[1.5px] border-[var(--color-primary)] bg-[var(--tint-primary)]'
                        : 'border-[var(--baseline)] bg-white hover:bg-black/[0.02]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                        active
                          ? 'border-[var(--color-primary)]'
                          : 'border-[var(--gridline)]'
                      }`}
                    >
                      {active && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                      )}
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-[var(--text-primary)]">
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                        {option.body}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[9px] font-bold tracking-[0.9px] text-[var(--text-muted)] uppercase">
              Formato
            </p>
            <div
              role="radiogroup"
              aria-label="Formato"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            >
              {FORMAT_OPTIONS.map((option) => {
                const active = format === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFormat(option.value)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${FOCUS_RING} ${
                      active
                        ? 'border-[1.5px] border-[var(--color-primary)] bg-[var(--tint-primary)]'
                        : 'border-[var(--baseline)] bg-white hover:bg-black/[0.02]'
                    }`}
                  >
                    <IconTile icon={option.icon} tone={option.tone} size={34} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[var(--text-primary)]">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-[var(--text-secondary)]">
                        {option.body}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[9px] font-bold tracking-[0.9px] text-[var(--text-muted)] uppercase">
              Opções
            </p>
            <label className="flex cursor-pointer items-start gap-3 px-0.5 py-1">
              <input
                type="checkbox"
                checked={includeMethodology}
                onChange={(event) => setIncludeMethodology(event.target.checked)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                  includeMethodology
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--gridline)] bg-white'
                }`}
              >
                {includeMethodology && (
                  <Check size={12} strokeWidth={3} className="text-white" />
                )}
              </span>
              <span>
                <span className="block text-xs font-semibold text-[var(--text-primary)]">
                  Incluir metodologia e limitações
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                  Uma folha com fontes, modelo vigente e o que o dado não diz
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 px-0.5 py-1">
              <input
                type="checkbox"
                checked={includeExcerpts}
                onChange={(event) => setIncludeExcerpts(event.target.checked)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                  includeExcerpts
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--gridline)] bg-white'
                }`}
              >
                {includeExcerpts && (
                  <Check size={12} strokeWidth={3} className="text-white" />
                )}
              </span>
              <span>
                <span className="block text-xs font-semibold text-[var(--text-primary)]">
                  Incluir trechos de publicações e comentários
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                  Aumenta muito o tamanho do arquivo e exige cuidado extra
                </span>
              </span>
            </label>

            {includeExcerpts && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--tint-amber)] bg-[var(--tint-amber)] px-4 py-3.5">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--tint-text-amber)]"
                />
                <p className="text-[11px] leading-relaxed text-[var(--tint-text-amber)]">
                  Você está incluindo conteúdo escrito por pessoas. Os autores saem
                  anonimizados, mas o texto continua sendo dado público de terceiros — use
                  apenas para a pesquisa e não redistribua o arquivo fora da equipe.
                </p>
              </div>
            )}
          </div>

          <div className="flex w-full items-center gap-2.5 rounded-xl bg-[var(--gridline)] px-4 py-3.5">
            <Info size={14} className="shrink-0 text-[var(--text-muted)]" />
            <p className="flex-1 text-[11px] font-semibold text-[var(--text-secondary)]">
              Serão exportadas {totalMentions.toLocaleString('pt-BR')} menções,{' '}
              {ranking.length} tópicos e {days} dias · estimativa de {previewSizeLabel}
            </p>
          </div>

          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={runExport}
              disabled={!canExport}
              title={
                canExport
                  ? undefined
                  : 'Só "Dados desta tela" em CSV está disponível nesta versão'
              }
            >
              <Download size={15} />
              Exportar {format.toUpperCase()}
            </Button>
          </div>
        </>
      )}

      {step === 'preparing' && (
        <>
          <div className="flex w-full items-center gap-3.5">
            <IconTile icon={Clock} tone="purple" size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Preparando o arquivo
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                Exportações grandes são geradas no servidor. Você pode continuar usando o
                painel — avisamos quando estiver pronto.
              </p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gridline)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {step === 'ready' && fileInfo && (
        <>
          <div className="flex w-full items-center gap-3.5">
            <IconTile icon={CheckCircle2} tone="green" size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Arquivo pronto
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed break-words text-[var(--text-secondary)]">
                {fileInfo.name} · {fileInfo.sizeLabel} · gerado a partir dos dados
                carregados nesta sessão
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="primary" onClick={handleDownload}>
              <Download size={14} />
              Baixar
            </Button>
            <Button
              variant="outline"
              disabled
              title="Compartilhamento por link ainda não existe — baixe o arquivo"
            >
              <Copy size={14} />
              Copiar link
            </Button>
          </div>
        </>
      )}

      {step === 'error' && (
        <>
          <div className="flex w-full items-center gap-3.5">
            <IconTile icon={AlertTriangle} tone="coral" size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Não foi possível gerar
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                A exportação passou do limite de tempo. Tente um período menor ou
                desmarque os trechos de publicações.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="primary" onClick={runExport}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => setStep('options')}>
              Voltar às opções
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
