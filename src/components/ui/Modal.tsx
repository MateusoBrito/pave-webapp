import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  ariaLabel: string
  children: ReactNode
}

/** Shell de modal reutilizável — overlay + card centralizado, Esc/clique-fora fecham.
 * Dimensões/raio/sombra seguem o spec "Estilo visual · PAVE" para modais. */
export function Modal({ open, onClose, ariaLabel, children }: Props) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-[600px] max-w-full flex-col items-start gap-5 overflow-y-auto rounded-[22px] bg-white p-[26px]"
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        {children}
      </div>
    </div>
  )
}
