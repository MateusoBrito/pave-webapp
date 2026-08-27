import { Skeleton } from './Skeleton'

/**
 * O header real (ícone/título/subtítulo) fica sempre visível — é texto estático,
 * conhecido antes do fetch, então não precisa virar placeholder. Só a área de dado
 * (valor, gráfico, linhas de tabela) vira skeleton.
 */

export function KpiCardSkeleton() {
  return (
    <div
      className="flex flex-1 items-center gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-5"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <Skeleton className="h-11 w-11 shrink-0 rounded-[14px]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  )
}

export function ChartCardSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />
}

export function TableCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  )
}
