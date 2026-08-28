import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Volta pro topo da página ao trocar de tela — o React Router não faz isso sozinho
 * numa SPA, senão navegar (ex.: Visão Geral → detalhe de tópico) mantém a rolagem
 * onde estava. Só reage ao pathname — mudar um filtro (querystring) não deve mexer
 * na rolagem de quem já está lendo a página. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
