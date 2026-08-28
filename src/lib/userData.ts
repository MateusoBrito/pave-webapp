import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { firestore } from './firebase'

export type AuthProviderId = 'password' | 'google.com'

interface UpsertOptions {
  /** primeira vez que essa conta loga — só então grava createdAt (não sobrescreve em logins seguintes) */
  isNewUser: boolean
  /** só verdadeiro no cadastro por e-mail/senha, onde o checkbox de termos existe de verdade */
  termsAccepted?: boolean
}

/**
 * Grava/atualiza o perfil em `userData/{uid}` — chamado em todo signup e login com
 * Google. Falha silenciosa (só loga um aviso): o Firestore pode ainda não estar
 * habilitado no Console, e isso não pode derrubar o login em si.
 */
export async function upsertUserData(
  user: User,
  provider: AuthProviderId,
  { isNewUser, termsAccepted }: UpsertOptions,
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      provider,
      updatedAt: serverTimestamp(),
    }
    if (isNewUser) payload.createdAt = serverTimestamp()
    if (termsAccepted) payload.termsAcceptedAt = serverTimestamp()

    await setDoc(doc(firestore, 'userData', user.uid), payload, { merge: true })
  } catch (err) {
    console.warn(
      'Não foi possível gravar userData (Firestore habilitado no Console?)',
      err,
    )
  }
}

/**
 * Remove `userData/{uid}` — usado quando o cadastro por e-mail é cancelado sem
 * confirmar o e-mail (ver AuthContext.cancelSignup). Best-effort: se o doc nunca
 * chegou a existir (caso normal, já que agora só gravamos após verificar o e-mail),
 * o delete é um no-op silencioso do próprio Firestore.
 */
export async function deleteUserData(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'userData', uid))
  } catch (err) {
    console.warn('Não foi possível remover userData:', err)
  }
}
