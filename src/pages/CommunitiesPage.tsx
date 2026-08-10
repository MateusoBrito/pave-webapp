import { usePageHeader } from '../context/PageHeaderContext'

/** Reservado na navegação, condicionado à Fase 5 — sem conteúdo funcional ainda. */
export function CommunitiesPage() {
  usePageHeader('Comunidades', 'Condicionado à Fase 5 do plano de projeto')

  return (
    <section className="rounded-xl border border-dashed border-[var(--baseline)] bg-[var(--chart-surface)] p-10 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Reservado para a Fase 5 — condicional
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
        Antes de construir, o plano exige um gate de valor analítico: que pergunta as
        comunidades respondem que tópicos + sentimento ainda não respondem? A decisão
        go/no-go entra aqui quando esse estudo estiver documentado.
      </p>
    </section>
  )
}
