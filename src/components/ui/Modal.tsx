import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  ariaLabel: string
  children: ReactNode
  /** 'md' (padrão, 600px) pra formulários/confirmação; 'lg' (920px) pra conteúdo denso
   * como tabelas — ver Modal / Todos os tópicos */
  size?: 'md' | 'lg'
}

const WIDTH_CLASS: Record<'md' | 'lg', string> = {
  md: 'w-[600px]',
  lg: 'w-[920px]',
}

/** Shell de modal reutilizável — overlay + card centralizado, Esc/clique-fora fecham.
 * Dimensões/raio/sombra seguem o spec "Estilo visual · PAVE" para modais. */
export function Modal({ open, onClose, ariaLabel, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  // via portal, direto em document.body — sem isso, um ancestral com `transform` (ex.:
  // a barra lateral, que usa translate-x pra animar a versão mobile) vira containing
  // block pra position:fixed, e o modal fica preso dentro dos limites dele em vez de
  // cobrir a tela inteira (acontecia com o ProfileMenu, que mora dentro da sidebar).
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className={`flex max-h-[85vh] ${WIDTH_CLASS[size]} max-w-full flex-col items-start gap-5 overflow-y-auto rounded-[22px] bg-white p-[26px]`}
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
