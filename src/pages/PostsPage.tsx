import { getCandidatePosts } from '../api/client'
import { ExamplePostsList } from '../components/dashboard/ExamplePostsList'
import { useFilters } from '../context/FiltersContext'
import { usePageHeader } from '../context/PageHeaderContext'
import { useAsync } from '../hooks'

export function PostsPage() {
  const { candidateIds } = useFilters()
  usePageHeader(
    'O que os candidatos postam?',
    'Anúncios pagos veiculados pelos próprios candidatos, via Meta Ad Library',
  )

  const {
    data: documents = [],
    loading,
    error,
    refetch,
  } = useAsync(() => getCandidatePosts(candidateIds), [candidateIds.join(',')])

  return (
    <>
      <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--tint-blue)] p-4 text-sm text-[var(--tint-text-blue)]">
        Conteúdo pago postado pelos próprios candidatos — não é conversa do público, e por
        isso fica fora das outras telas. O filtro de rede social não se aplica aqui: é
        sempre Meta Ads.
      </div>
      <ExamplePostsList
        documents={documents}
        loading={loading}
        error={error}
        refetch={refetch}
      />
    </>
  )
}
