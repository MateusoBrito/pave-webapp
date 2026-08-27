import type { CSSProperties } from 'react'

interface Props {
  className?: string
  style?: CSSProperties
}

/** Barra base pulsante — bloco de construção dos skeletons de card/gráfico/tabela. */
export function Skeleton({ className = '', style }: Props) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--gridline)] ${className}`}
      style={style}
    />
  )
}
