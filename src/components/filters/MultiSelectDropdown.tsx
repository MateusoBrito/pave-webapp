import { useEffect, useRef, useState } from 'react'

interface Option {
  id: string
  label: string
}

interface Props {
  label: string
  options: Option[]
  /** [] = todos selecionados */
  selected: string[]
  onChange: (ids: string[]) => void
  summary: string
}

/** Dropdown de seleção múltipla com resumo no botão — usado por candidato e rede social. */
export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  summary,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(id: string) {
    const allSelected = selected.length === 0
    const base = allSelected ? options.map((o) => o.id) : selected
    const isChecked = allSelected || selected.includes(id)
    const next = isChecked ? base.filter((v) => v !== id) : [...base, id]
    // selecionar todos de novo volta ao estado "vazio = todos"
    onChange(next.length === options.length ? [] : next)
  }

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="min-w-[170px] rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-left text-sm text-[var(--text-primary)]"
      >
        {summary}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-56 rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] p-2 shadow-lg">
          {options.map((option) => {
            const checked = selected.length === 0 || selected.includes(option.id)
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="h-3.5 w-3.5"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
