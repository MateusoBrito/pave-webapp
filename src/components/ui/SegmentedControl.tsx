import { FOCUS_RING } from './focusRing'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

/** Grupo de botões, um ativo em roxo sólido — usado pelos presets de período e
 * pelo toggle de modo do gráfico de tópicos. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="flex gap-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${FOCUS_RING} ${
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--baseline)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
