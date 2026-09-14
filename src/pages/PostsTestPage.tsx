import { formatBRLRange } from '../lib/format'
import type { MetaAdPlatform } from '../types'

export function PostsTestPage() {
  const { candidateIds, day, period: globalPeriod } = useFilters()
  const [platforms, setPlatforms] = useState<MetaAdPlatform[]>([])
  const period = { from: day, to: day }
  
  usePageHeader(
    'O que os candidatos postam? (Teste)',
    `Anúncios pagos publicados pelos próprios candidatos, via Meta Ad Library · ${formatFullDate(day)}`,
  )

  const deps = [candidateIds.join(','), period.from, period.to, globalPeriod.from, globalPeriod.to, platforms.join(',')]

  const { data: entities = [] } = useAsync(() => getEntities(), [])
  const { data: topics = [] } = useAsync(() => getTopics(), [])

  // TESTE: Busca os indicadores (KPIs) considerando todo o período do filtro global, não apenas o dia!
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAsync(() => getCandidateContentSummary(candidateIds, globalPeriod, platforms), deps)
  
  const {
    data: ranking = [],
    loading: rankingLoading,
    error: rankingError,
  } = useAsync(() => getAdTopicRanking(candidateIds, period, platforms), deps)
  
  // TESTE: Busca os anúncios. Se não tiver no dia, busca no período global.
  const {
    data: documentsData,
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useAsync(async () => {
    let docs = await getCandidatePosts(candidateIds, period, platforms)
    if (docs.length === 0) {
      docs = await getCandidatePosts(candidateIds, globalPeriod, platforms)
      return { docs, isFallback: true }
    }
    return { docs, isFallback: false }
  }, deps)

  const documents = documentsData?.docs || []
  const isFallback = documentsData?.isFallback || false

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CandidateAvatarFilter singleSelect />
        <MetaPlatformFilter value={platforms} onChange={setPlatforms} />
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--tint-blue)] px-4 py-3 text-sm text-[var(--tint-text-blue)]">
        <Megaphone size={16} className="shrink-0 text-[var(--color-blue)]" />
        Aqui o conteúdo é do próprio candidato, não do público: são anúncios pagos declarados na Meta Ad Library. Por isso esta tela não traz análise de sentimento — não há reação pública coletável nos anúncios.
      </div>

      <div className="mb-2">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
          Resumo do Período
        </h2>
        <p className="text-[11px] text-[var(--text-muted)]">
          Total contabilizado considerando o período inteiro selecionado nos filtros ({globalPeriod.from} até {globalPeriod.to})
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryLoading || !summary ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              icon={Wallet}
              tone="blue"
              label="Investimento declarado"
              value={formatBRLRange(summary.investmentMinBRL, summary.investmentMaxBRL)}
              subtext="a Ad Library publica faixas, não valores exatos"
            />
            <KpiCard
              icon={Megaphone}
              tone="purple"
              label="Anúncios veiculados"
              value={summary.adsCount.toLocaleString('pt-BR')}
              subtext={`${summary.activeAdsCount} ainda ativos no fim do período`}
            />
            <KpiCard
              icon={Eye}
              tone="green"
              label="Impressões estimadas"
              value={`${(summary.impressionsMinTotal / 1_000_000).toFixed(1).replace('.', ',')} mi – ${(summary.impressionsMaxTotal / 1_000_000).toFixed(1).replace('.', ',')} mi`}
              subtext="faixa agregada dos candidatos selecionados"
            />
          </>
        )}
      </section>

      {summaryError && (
        <p className="text-sm text-[var(--color-coral)]">
          Não foi possível carregar os indicadores.{' '}
          <button
            type="button"
            onClick={refetchSummary}
            className="underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </p>
      )}

      <AdsTimelineChart
        entities={entities}
        rankingRows={ranking}
        rankingLoading={rankingLoading}
        rankingError={rankingError}
      />

      {isFallback && !documentsLoading && documents.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--tint-coral)] px-4 py-3 text-sm text-[var(--color-coral)] mt-2">
          <Info size={16} className="shrink-0" />
          Não há anúncios novos publicados no dia {formatFullDate(day)}. Exibindo outros anúncios do candidato encontrados no período completo selecionado.
        </div>
      )}

      <AdExamplesCarousel
        documents={documents}
        entities={entities}
        topics={topics}
        loading={documentsLoading}
        error={documentsError}
        refetch={refetchDocuments}
      />
    </>
  )
}

