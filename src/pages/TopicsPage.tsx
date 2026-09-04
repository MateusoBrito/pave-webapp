import { Info } from 'lucide-react'
import {
  getCandidateSentimentBreakdown,
  getEntities,
  getNetworkDocuments,
  getTopicRanking,
  getTopics,
  getTopicsBySubdivision,
  getTopicSeries,
} from '../api/client'
import { CandidateSentimentBreakdown } from '../components/dashboard/CandidateSentimentBreakdown'
import { TopicExamplePosts } from '../components/dashboard/TopicExamplePosts'
import { TopicSentimentBreakdownList } from '../components/dashboard/TopicSentimentBreakdownList'
import { TopicsBySubdivisionGrid } from '../components/dashboard/TopicsBySubdivisionGrid'
import { TopicsRankingList } from '../components/dashboard/TopicsRankingList'
import { TopicsStackedChart } from '../components/dashboard/TopicsStackedChart'
import { DEFAULT_SINGLE_NETWORK } from '../components/filters/NetworkChipFilter'
import { IconTile } from '../components/ui/IconTile'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatDateRange } from '../lib/dates'

type UserNetwork = 'reddit' | 'youtube'

const NETWORK_LABEL: Record<UserNetwork, string> = {
  reddit: 'Reddit',
  youtube: 'YouTube',
}

const SCOPE_NOTE: Record<UserNetwork, { text: string; bg: string; text_color: string }> =
  {
    reddit: {
      text: 'Esta análise cobre publicações e comentários de subreddits brasileiros selecionados.',
      bg: 'var(--tint-amber)',
      text_color: 'var(--tint-text-amber)',
    },
    youtube: {
      text: 'Esta análise cobre comentários publicados nos vídeos dos canais oficiais dos candidatos.',
      bg: 'var(--tint-coral)',
      text_color: 'var(--tint-text-coral)',
    },
  }

export function TopicsPage() {
  const { candidateIds, networks, period } = useFilters()
  const selected = networks[0]
  const network: UserNetwork =
    selected === 'reddit' || selected === 'youtube'
      ? selected
      : (DEFAULT_SINGLE_NETWORK as UserNetwork)
  const scopeNote = SCOPE_NOTE[network]

  usePageHeader(
    'O que os usuários comentam?',
    `Comentários e publicações do público no ${NETWORK_LABEL[network]} · ${formatDateRange(period)}`,
  )

  const deps = [candidateIds.join(','), period.from, period.to, network]

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const { data: topics = [] } = useAsync(() => getTopics(), [])

  const {
    data: series = [],
    loading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useAsync(
    () => getTopicSeries({ entityIds: candidateIds, networks: [network], period }),
    deps,
  )
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
    refetch: refetchRanking,
  } = useAsync(() => getTopicRanking(candidateIds, period, [network]), deps)
  const {
    data: matrix,
    loading: matrixLoading,
    error: matrixError,
    refetch: refetchMatrix,
  } = useAsync(() => getTopicsBySubdivision(candidateIds, period, network), deps)
  const {
    data: candidateSentiment = [],
    loading: candidateSentimentLoading,
    error: candidateSentimentError,
    refetch: refetchCandidateSentiment,
  } = useAsync(
    () => getCandidateSentimentBreakdown(candidateIds, period, [network]),
    deps,
  )
  const {
    data: documents = [],
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(() => getNetworkDocuments(candidateIds, period, network), deps)

  return (
    <>
      <div
        className="flex items-center gap-[11px] rounded-[14px] border border-[var(--baseline)] px-[18px] py-[13px]"
        style={{ backgroundColor: scopeNote.bg }}
      >
        <IconTile icon={Info} tone={network === 'reddit' ? 'amber' : 'coral'} size={30} />
        <p
          className="flex-1 text-[11px] leading-relaxed"
          style={{ color: scopeNote.text_color }}
        >
          {scopeNote.text}
        </p>
      </div>

      <TopicsStackedChart
        topics={topics}
        entities={entities}
        series={series}
        loading={seriesLoading}
        error={seriesError}
        refetch={refetchSeries}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopicsRankingList
          rows={ranking}
          entities={entities}
          loading={rankingLoading}
          error={rankingError}
          refetch={refetchRanking}
        />
        <TopicsBySubdivisionGrid
          matrix={matrix}
          title={network === 'reddit' ? 'Tópicos por subreddit' : 'Tópicos por canal'}
          subtitle={
            network === 'reddit'
              ? 'Onde cada tema circula dentro do Reddit'
              : 'Onde cada tema circula entre os canais oficiais'
          }
          entities={entities}
          loading={matrixLoading}
          error={matrixError}
          refetch={refetchMatrix}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CandidateSentimentBreakdown
          rows={candidateSentiment}
          subtitle={`Distribuição dos comentários no ${NETWORK_LABEL[network]}`}
          loading={candidateSentimentLoading}
          error={candidateSentimentError}
          refetch={refetchCandidateSentiment}
        />
        <TopicSentimentBreakdownList
          rows={ranking}
          entities={entities}
          subtitle="Sentimento dos comentários em cada tema · o percentual aparece dentro da própria faixa"
          loading={rankingLoading}
          error={rankingError}
          refetch={refetchRanking}
        />
      </section>

      <TopicExamplePosts
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        refetch={refetchDocuments}
        title={
          network === 'reddit'
            ? 'Exemplos de publicações e comentários'
            : 'Exemplos de comentários'
        }
        subtitle="Use as setas para percorrer as publicações do período"
      />
    </>
  )
}
