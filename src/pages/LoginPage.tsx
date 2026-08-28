import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Clock, Eye, EyeOff, Key, Lock, Mail, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout'
import { INPUT_FIELD, INPUT_SHELL } from '../components/auth/authField'
import { PasswordStrengthBar, computeStrength } from '../components/auth/PasswordStrength'
import { Button } from '../components/ui/Button'
import { FOCUS_RING } from '../components/ui/focusRing'
import { IconTile } from '../components/ui/IconTile'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'signup' | 'forgot'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setForgotSent(false)
  }

  async function handleGoogle() {
    setError('')
    setSubmitting(true)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar com Google.')
    } finally {
      setSubmitting(false)
    }
  }

  const strength = computeStrength(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const signupValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    strength.score === 3 &&
    passwordsMatch &&
    acceptedTerms

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password, remember)
      } else if (mode === 'signup') {
        if (!signupValid) return
        await signUpWithEmail(name, email, password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível completar a ação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setForgotSent(false)
    setSubmitting(true)
    try {
      await resetPassword(email)
      setForgotSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8"
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        {mode === 'forgot' ? (
          <>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`mb-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </button>

            <IconTile icon={Key} tone="purple" size={48} />

            <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
              Recuperar acesso
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Informe o e-mail cadastrado. Enviaremos um link para você criar uma nova
              senha.
            </p>

            <form onSubmit={handleForgotSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  E-mail cadastrado
                </span>
                <div className={INPUT_SHELL}>
                  <Mail size={18} className="shrink-0 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@instituicao.edu.br"
                    className={INPUT_FIELD}
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-lg bg-[var(--tint-coral)] px-3 py-2 text-sm text-[var(--tint-text-coral)]">
                  {error}
                </p>
              )}
              {forgotSent && (
                <p className="rounded-lg bg-[var(--tint-green)] px-3 py-2 text-sm text-[var(--tint-text-green)]">
                  Link enviado! Confira sua caixa de entrada.
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Enviando…' : 'Enviar link de recuperação'}
              </Button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--tint-amber)] px-3 py-2.5 text-xs text-[var(--tint-text-amber)]">
              <Clock size={16} className="mt-0.5 shrink-0" />
              <p>
                O link expira em 30 minutos. Por segurança, a mensagem é a mesma existindo
                ou não uma conta com esse e-mail.
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar sua conta'}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {mode === 'login'
                ? 'Entre para acompanhar o que se fala sobre cada candidato.'
                : 'Cadastre-se para acompanhar os temas e o sentimento de cada candidato.'}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className={`mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--baseline)] py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              <GoogleIcon />
              {mode === 'login' ? 'Continuar com Google' : 'Cadastrar com Google'}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--baseline)]" />
              <span className="text-xs text-[var(--text-muted)]">
                {mode === 'login' ? 'ou entre com e-mail' : 'ou preencha os dados'}
              </span>
              <div className="h-px flex-1 bg-[var(--baseline)]" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Nome completo
                  </span>
                  <div className={INPUT_SHELL}>
                    <User size={18} className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Seu nome"
                      className={INPUT_FIELD}
                    />
                  </div>
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  E-mail
                </span>
                <div className={INPUT_SHELL}>
                  <Mail size={18} className="shrink-0 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@instituicao.edu.br"
                    className={INPUT_FIELD}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Senha
                </span>
                <div className={INPUT_SHELL}>
                  <Lock size={18} className="shrink-0 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••"
                    className={INPUT_FIELD}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className={`shrink-0 rounded text-[var(--text-muted)] ${FOCUS_RING}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <PasswordStrengthBar
                    password={password}
                    hint="mínimo 8 caracteres, com número e maiúscula"
                  />
                )}
              </label>

              {mode === 'signup' && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Confirmar senha
                  </span>
                  <div className={INPUT_SHELL}>
                    <Lock size={18} className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••••"
                      className={INPUT_FIELD}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className={`shrink-0 rounded text-[var(--text-muted)] ${FOCUS_RING}`}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <span className="text-xs text-[var(--tint-text-coral)]">
                      As senhas não são iguais.
                    </span>
                  )}
                </label>
              )}

              {mode === 'login' && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <label className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border-[var(--baseline)] text-[var(--color-primary)]"
                    />
                    Manter conectado
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className={`rounded font-medium text-[var(--color-primary-dark)] hover:underline ${FOCUS_RING}`}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--baseline)] text-[var(--color-primary)]"
                  />
                  <span>
                    Li e aceito os <strong>Termos de Uso</strong> e a{' '}
                    <strong>Política de Privacidade</strong>, incluindo o tratamento dos
                    meus dados conforme a LGPD.
                  </span>
                </label>
              )}

              {error && (
                <p className="rounded-lg bg-[var(--tint-coral)] px-3 py-2 text-sm text-[var(--tint-text-coral)]">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting || (mode === 'signup' && !signupValid)}
                className="w-full"
              >
                {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className={`rounded font-medium text-[var(--color-primary-dark)] hover:underline ${FOCUS_RING}`}
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
