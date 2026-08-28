import { Info } from 'lucide-react'
import { useMatch } from 'react-router-dom'
import { CandidateAvatarFilter } from './CandidateAvatarFilter'
import { NetworkChipFilter } from './NetworkChipFilter'
import { PeriodFilterCard } from './PeriodFilterCard'

/**
 * Filtros globais, refletidos na URL — mas o que aparece muda por rota: o drill-down
 * de tópico e o Comparativo têm filtros diferentes do padrão (ver README das duas
 * telas no Figma).
 */
export function FilterBar() {
  const isTopics = useMatch('/topicos')
  const isTopicDetail = useMatch('/topicos/:topicId')
  const isComparison = useMatch('/comparativo')
  const isMethodology = useMatch('/metodologia')
  const isPosts = useMatch('/posts')

  // metodologia é conteúdo estático — não filtra por candidato, período ou rede
  if (isMethodology) return null

  // anúncios são sempre Meta Ads — o filtro de rede não se aplica aqui
  if (isPosts) {
    return (
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CandidateAvatarFilter />
          <PeriodFilterCard />
        </div>
      </div>
    )
  }

  // "O que os usuários comentam?" é sempre uma rede por vez (Reddit ou YouTube) — Meta
  // Ads não entra: é conteúdo do candidato, não do público (ver PostsPage)
  if (isTopics) {
    return (
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CandidateAvatarFilter />
          <PeriodFilterCard />
          <NetworkChipFilter
            singleSelect
            title="Qual plataforma?"
            options={['youtube', 'reddit']}
          />
        </div>
      </div>
    )
  }

  if (isTopicDetail) {
    return (
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <div className="md:w-[360px] md:shrink-0">
            <PeriodFilterCard />
          </div>
          <div className="flex flex-1 items-start gap-3 rounded-2xl border border-[var(--baseline)] bg-[var(--tint-primary)] px-5 py-[18px]">
            <Info size={18} className="mt-0.5 shrink-0 text-[var(--tint-text-primary)]" />
            <div>
              <p className="text-xs font-bold text-[var(--tint-text-primary)]">
                Aqui não há filtro de candidato, rede ou assunto
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                O tópico já nasce associado a um candidato e a uma rede — o modelo gera
                conjuntos separados para cada combinação. Só o período faz sentido
                ajustar.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // comparativo tem sua própria ordem (seletor de candidatos antes do período/rede,
  // conforme Figma) — os filtros são renderizados dentro de ComparisonPage
  if (isComparison) return null

  return (
    <div className="px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CandidateAvatarFilter />
        <PeriodFilterCard />
        <NetworkChipFilter />
      </div>
    </div>
  )
}
