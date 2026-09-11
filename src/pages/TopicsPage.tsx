import {
  getCandidateSentimentBreakdown,
  getEntities,
  getNetworkDocuments,
  getTopicRanking,
  getTopicsBySubdivision,
} from '../api/client'
import { TopicExamplePosts } from '../components/dashboard/TopicExamplePosts'
import { TopicsBySubdivisionGrid } from '../components/dashboard/TopicsBySubdivisionGrid'
import { TopicsTimelineChart } from '../components/dashboard/TopicsTimelineChart'
import { DEFAULT_SINGLE_NETWORK } from '../components/filters/NetworkChipFilter'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { formatFullDate } from '../lib/dates'

type UserNetwork = 'reddit' | 'youtube'

const NETWORK_LABEL: Record<UserNetwork, string> = {
  reddit: 'Reddit',
  youtube: 'YouTube',
}

export function TopicsPage() {
  const { candidateIds, networks, day } = useFilters()
  const selected = networks[0]
  const network: UserNetwork =
    selected === 'reddit' || selected === 'youtube'
      ? selected
      : (DEFAULT_SINGLE_NETWORK as UserNetwork)
  // A modelagem de tópicos é por dia (ver pipeline/weekly_topics.py em pave-tm) - não
  // existe mais um "período" de verdade aqui, só um dia. `period` continua sendo a
  // forma que a API espera (from/to), só que os dois iguais.
  const period = { from: day, to: day }

  /** A matriz tópico × subdivisão só diz algo quando o tópico pode aparecer em mais de
   * uma coluna. No Reddit as colunas são subreddits e ele pode. No YouTube a coluna é o
   * canal oficial — um por candidato — e tópico pertence a um candidato só, então toda
   * linha teria exatamente uma célula preenchida e o resto zero. Isso não é dado ralo, é
   * o eixo das colunas duplicando o de propriedade: a diagonal sai imposta por
   * construção, e o TopicsTimelineChart acima já mostra tópico, dono e volume. */
  const mostraSubdivisao = network === 'reddit'

  usePageHeader(
    'O que os usuários comentam?',
    `Comentários e publicações do público no ${NETWORK_LABEL[network]} · ${formatFullDate(day)}`,
  )

  const deps = [candidateIds.join(','), period.from, period.to, network]

  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
  } = useAsync(() => getTopicRanking(candidateIds, period, [network], undefined, false), deps)
  const {
    data: matrix,
    loading: matrixLoading,
    error: matrixError,
    refetch: refetchMatrix,
  } = useAsync(
    () =>
      mostraSubdivisao
        ? getTopicsBySubdivision(candidateIds, period, network)
        : Promise.resolve(undefined),
    deps,
  )
  const { data: candidateSentiment = [] } = useAsync(
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
      <TopicsTimelineChart
        entities={entities}
        network={network}
        rankingRows={ranking}
        rankingLoading={rankingLoading}
        rankingError={rankingError}
        sentiment={candidateSentiment}
      />

      {mostraSubdivisao && (
        <section className="grid grid-cols-1 gap-6">
          <TopicsBySubdivisionGrid
            matrix={matrix}
            title="Tópicos por subreddit"
            subtitle="Onde cada tema circula dentro do Reddit"
            entities={entities}
            loading={matrixLoading}
            error={matrixError}
            refetch={refetchMatrix}
          />
        </section>
      )}

      <TopicExamplePosts
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        refetch={refetchDocuments}
        title={
          network === 'reddit'
            ? 'Publicações e comentários mais recentes'
            : 'Comentários mais recentes'
        }
        subtitle="Use as setas para percorrer as publicações do período"
      />
    </>
  )
}
