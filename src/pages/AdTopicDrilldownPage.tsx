import { Megaphone } from 'lucide-react'
import { useParams } from 'react-router-dom'
import type { PeriodFilter } from '../api/client'
import { getAdTopicDetail, getAdTopicSeries, getCandidatePosts, getEntities } from '../api/client'
import { AdExamplesCarousel } from '../components/dashboard/AdExamplesCarousel'
import { AdTopicHeader } from '../components/dashboard/AdTopicHeader'
import { VolumeOverTimeChart } from '../components/dashboard/VolumeOverTimeChart'
import { Avatar } from '../components/ui/Avatar'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'
import { candidateColor } from '../lib/colors'
import { formatFullDate } from '../lib/dates'

/** Drill-down de tópico de anúncio - análogo a TopicDrilldownPage.tsx, mas para tópicos
 * escopados a meta_ads (ver AdTopicRankingList.tsx: /topics/{id} é hard-restrito a redes
 * orgânicas e nunca resolve um tópico de anúncio, daí esta página e os endpoints
 * /candidates/content/topics/{id}[/series] próprios). Sem sentimento - anúncio pago não
 * tem reação pública coletável (mesma nota já usada em PostsPage.tsx). Sem seletor de
 * período: sempre a vigência do próprio tópico (ver detail.periodStart/End), mesma
 * lógica e mesmo motivo do drill-down orgânico. */
export function AdTopicDrilldownPage() {
  const { topicId } = useParams<{ topicId: string }>()

  const { data: entities = [] } = useAsync(() => getEntities(), [])

  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useAsync(
    () => (topicId ? getAdTopicDetail(topicId) : Promise.resolve(undefined)),
    [topicId],
  )

  // cada tópico pertence a um candidato só
  const ownerEntity = detail
    ? entities.find((e) => e.id === detail.topic.entityId)
    : undefined
  const topicOwnerEntities = ownerEntity ? [ownerEntity] : []

  const topicPeriod: PeriodFilter | undefined = detail
    ? { from: detail.periodStart, to: detail.periodEnd }
    : undefined
  // VolumeOverTimeChart lê `.from`/`.to` incondicionalmente (detectGapRanges), mesmo
  // enquanto `loading=true` - precisa de algum período válido já no primeiro render,
  // antes da vigência do tópico chegar. O valor não importa: `series` ainda está vazio
  // nesse momento, então não há gap nenhum pra calcular de verdade.
  const today = new Date().toISOString().slice(0, 10)
  const chartPeriod: PeriodFilter = topicPeriod ?? { from: today, to: today }

  usePageHeader(
    'Detalhes do Tópico de Anúncio',
    detail
      ? `${detail.topic.label} · ${formatFullDate(detail.periodStart)} – ${formatFullDate(detail.periodEnd)}`
      : '...',
  )

  const {
    data: series = [],
    loading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useAsync(
    () =>
      topicId && topicPeriod
        ? getAdTopicSeries(topicId, topicPeriod)
        : Promise.resolve([]),
    [topicId, detail?.periodStart, detail?.periodEnd],
  )

  // Não existe endpoint de "anúncios de um tópico" - busca os anúncios do candidato dono
  // do tópico na vigência do tópico (mesma fonte que AdExamplesCarousel já usa em
  // PostsPage.tsx, TopicDocument já vem com topicId) e filtra no client. Depende de
  // `detail` já ter resolvido o candidato dono e a vigência, por isso a busca só
  // dispara depois (pequena cascata, sem endpoint novo).
  const {
    data: allPosts = [],
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAsync(
    () =>
      ownerEntity && topicPeriod
        ? getCandidatePosts([ownerEntity.id], topicPeriod)
        : Promise.resolve([]),
    [ownerEntity?.id, detail?.periodStart, detail?.periodEnd],
  )
  const documents = topicId ? allPosts.filter((d) => d.topicId === topicId) : []

  const entityColor = ownerEntity ? candidateColor(ownerEntity.id) : 'var(--color-primary)'

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {ownerEntity && (
          <span
            className="flex items-center gap-2.5 rounded-xl py-2 pr-4 pl-2"
            style={{ backgroundColor: `${entityColor}1a` }}
          >
            <Avatar
              name={ownerEntity.name}
              color={entityColor}
              size={36}
              photoUrl={ownerEntity.photoUrl}
            />
            <span className="text-lg font-bold" style={{ color: entityColor }}>
              {ownerEntity.name}
            </span>
          </span>
        )}
      </div>

      <AdTopicHeader
        detail={detail}
        ownerEntity={ownerEntity}
        loading={detailLoading}
        error={detailError}
        refetch={refetchDetail}
      />

      <VolumeOverTimeChart
        entities={topicOwnerEntities}
        points={series}
        loading={seriesLoading}
        error={seriesError}
        refetch={refetchSeries}
        period={chartPeriod}
        icon={Megaphone}
        tone="blue"
        title="Evolução do tópico"
        subtitle="Anúncios veiculados por dia"
      />

      <AdExamplesCarousel
        documents={documents}
        entities={entities}
        topics={detail ? [detail.topic] : []}
        loading={detailLoading || postsLoading}
        error={postsError}
        refetch={refetchPosts}
      />
    </>
  )
}
