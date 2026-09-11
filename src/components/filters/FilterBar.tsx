import { useMatch } from 'react-router-dom'
import { CandidateAvatarFilter } from './CandidateAvatarFilter'
import { NetworkChipFilter } from './NetworkChipFilter'

/**
 * Filtros globais, refletidos na URL — mas o que aparece muda por rota: o drill-down
 * de tópico e o Comparativo têm filtros diferentes do padrão (ver README das duas
 * telas no Figma).
 */
export function FilterBar() {
  const isTopics = useMatch('/topicos')
  const isTopicDetail = useMatch('/topicos/:topicId')
  const isAdTopicDetail = useMatch('/anuncios/:topicId')
  const isComparison = useMatch('/comparativo')
  const isMethodology = useMatch('/metodologia')
  const isPosts = useMatch('/posts')

  // metodologia é conteúdo estático — não filtra por candidato, período ou rede
  if (isMethodology) return null

  // anúncios são sempre Meta Ads — o filtro de rede global não se aplica aqui; a tela
  // tem o próprio filtro de plataforma (Facebook/Instagram), que é local à página,
  // não ao FiltersContext (só existe dentro de Meta Ads) — ver PostsPage
  if (isPosts) return null

  // "O que os usuários comentam?" é sempre uma rede por vez (Reddit ou YouTube) — Meta
  // Ads não entra: é conteúdo do candidato, não do público (ver PostsPage). O dia é
  // escolhido dentro da própria página agora, clicando no TopicsCalendarCard - não tem
  // mais um card de dia aqui (ver DayFilterCard, removido).
  if (isTopics) {
    return (
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CandidateAvatarFilter singleSelect />
          <NetworkChipFilter
            singleSelect
            title="Qual plataforma?"
            options={['youtube', 'reddit']}
          />
        </div>
      </div>
    )
  }

  // Drill-down de tópico (orgânico e anúncio): o único filtro global que se aplica é o
  // período — o tópico já nasce associado a um candidato (e, no orgânico, a uma rede).
  // Essa identidade só a página conhece (TopicHeader/AdTopicHeader carregam o detalhe do
  // tópico), então o período + a nota de identidade são responsabilidade da própria
  // página agora, não deste componente global.
  if (isTopicDetail || isAdTopicDetail) return null

  // comparativo tem sua própria ordem (seletor de candidatos antes do período/rede,
  // conforme Figma) — os filtros são renderizados dentro de ComparisonPage
  if (isComparison) return null

  // Visão Geral (única rota que cai aqui - ver comentários acima) sempre mostra todo
  // o período disponível, sem seletor - ver OverviewPage/allTimePeriod.
  return (
    <div className="px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CandidateAvatarFilter />
        <NetworkChipFilter />
      </div>
    </div>
  )
}
