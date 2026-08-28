import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { deleteUserData, upsertUserData } from '../lib/userData'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/popup-closed-by-user': 'Login cancelado.',
  'auth/network-request-failed': 'Falha de conexão. Tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  'auth/operation-not-allowed':
    'Esse método de login ainda não foi habilitado no projeto Firebase.',
}

function friendlyError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : ''
  return ERROR_MESSAGES[code] ?? 'Não foi possível completar a ação. Tente novamente.'
}

async function withFriendlyError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    throw new Error(friendlyError(err))
  }
}

export interface AuthValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string, remember: boolean) => Promise<void>
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  /** Recarrega o user do Firebase (ex.: detectar e-mail recém-verificado) e força o
   * contexto a re-renderizar — `reload()` muta o user em memória sem disparar
   * onAuthStateChanged sozinho. Grava o userData na primeira vez em que detecta o
   * e-mail passando de não-verificado para verificado (ver AuthProvider). */
  refreshUser: () => Promise<void>
  /** Desiste de um cadastro por e-mail ainda não confirmado — apaga o userData (se
   * chegou a existir) e a própria conta do Auth. Só faz sentido enquanto o e-mail
   * não foi verificado (tela VerifyEmailNotice). */
  cancelSignup: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value: AuthValue = {
    user,
    loading,
    signInWithGoogle: () =>
      withFriendlyError(async () => {
        await setPersistence(auth, browserLocalPersistence)
        const credential = await signInWithPopup(auth, new GoogleAuthProvider())
        const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false
        // roda em paralelo — não trava o login por causa do Firestore (que pode nem
        // estar habilitado ainda) nem arrisca "chegar atrasado" depois de um logout
        void upsertUserData(credential.user, 'google.com', { isNewUser })
      }),
    signInWithEmail: (email, password, remember) =>
      withFriendlyError(async () => {
        await setPersistence(
          auth,
          remember ? browserLocalPersistence : browserSessionPersistence,
        )
        await signInWithEmailAndPassword(auth, email, password)
      }),
    signUpWithEmail: (name, email, password) =>
      withFriendlyError(async () => {
        await setPersistence(auth, browserLocalPersistence)
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(credential.user, { displayName: name })
        // updateProfile muta o user em memória, mas não dispara onAuthStateChanged de
        // novo — força o re-render com uma cópia rasa (só lemos campos de dado do user
        // no resto do app, nunca métodos, então a cópia é segura aqui).
        setUser({ ...credential.user } as User)
        // userData só é gravado depois que o e-mail for confirmado (ver refreshUser) —
        // até lá a conta existe no Auth (inevitável, é o Firebase quem manda o link),
        // mas não "de verdade" pro resto do app. O envio do e-mail roda em paralelo,
        // sem travar aqui.
        sendEmailVerification(credential.user).catch((err) => {
          console.warn('Não foi possível enviar o e-mail de verificação:', err)
        })
      }),
    resetPassword: (email) =>
      withFriendlyError(() =>
        sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: true,
        }),
      ),
    logout: () => withFriendlyError(() => signOut(auth)),
    refreshUser: () =>
      withFriendlyError(async () => {
        const wasVerified = auth.currentUser?.emailVerified ?? false
        await auth.currentUser?.reload()
        const nextUser = auth.currentUser
        const justVerified =
          nextUser &&
          !wasVerified &&
          nextUser.emailVerified &&
          nextUser.providerData[0]?.providerId === 'password'
        if (justVerified) {
          void upsertUserData(nextUser, 'password', {
            isNewUser: true,
            termsAccepted: true,
          })
        }
        setUser(nextUser ? ({ ...nextUser } as User) : null)
      }),
    cancelSignup: () =>
      withFriendlyError(async () => {
        const current = auth.currentUser
        if (!current) return
        await deleteUserData(current.uid)
        await deleteUser(current)
      }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
