import { usePageHeader } from '../context/PageHeaderContext'

const ITEMS = [
  {
    title: 'Fontes de dados',
    body: 'YouTube e Reddit via API oficial; anúncios de Instagram e Facebook via Meta Ad Library. X/Twitter em avaliação de custo.',
  },
  {
    title: 'Tópicos',
    body: 'BERTopic + embeddings Sentence-BERT sobre o corpus completo, alinhado entre redes. Re-modelagem mensal, classificação diária.',
  },
  {
    title: 'Sentimento',
    body: 'Classificação ternária (negativo/neutro/positivo), escolhida por benchmark em bases públicas — ver Fase 4 do plano de projeto.',
  },
  {
    title: 'Privacidade',
    body: 'Somente conteúdo público via APIs oficiais; dados de autor minimizados; política de retenção documentada (LGPD).',
  },
]

export function MethodologyPage() {
  usePageHeader('Metodologia', 'Como os dados são coletados, processados e classificados')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ITEMS.map((item) => (
        <section
          key={item.title}
          className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.body}</p>
        </section>
      ))}
    </div>
  )
}
