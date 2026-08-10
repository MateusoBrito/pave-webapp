import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface PageHeader {
  title: string
  subtitle?: string
}

interface PageHeaderContextValue {
  header: PageHeader
  setHeader: (header: PageHeader) => void
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader>({ title: '' })
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

/** Cada página chama isso pra dizer ao TopBar (fora do fluxo da rota) o que exibir. */
export function usePageHeader(title: string, subtitle?: string) {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) throw new Error('usePageHeader must be used within PageHeaderProvider')
  const { setHeader } = ctx
  useEffect(() => {
    setHeader({ title, subtitle })
  }, [title, subtitle, setHeader])
}

export function useCurrentPageHeader(): PageHeader {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) throw new Error('useCurrentPageHeader must be used within PageHeaderProvider')
  return ctx.header
}
