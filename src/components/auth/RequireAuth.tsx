import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { VerifyEmailNotice } from './VerifyEmailNotice'

/** Login Google já vem com o e-mail verificado pelo próprio Google — só contas por
 * senha passam pela tela de "Verifique seu e-mail". */
function needsEmailVerification(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  return !user.emailVerified && user.providerData[0]?.providerId === 'password'
}

/** Protege rotas atrás de login — redireciona pra /login se não houver sessão, e
 * barra o painel com a tela de verificação de e-mail até a conta ser confirmada. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-plane)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (needsEmailVerification(user)) return <VerifyEmailNotice />
  return <>{children}</>
}
