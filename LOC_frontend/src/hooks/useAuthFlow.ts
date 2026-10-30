import { useState } from 'react'
import { useSignIn, useSignUp, useUser } from '@clerk/clerk-react'
import { getClerkErrorMessage } from '../lib/auth'
import type { AuthFlow, AuthForm, AuthMode, AuthView } from '../types/auth'

/** Every Clerk call behind the login screen: sign-in, sign-up with email verification, password reset and Google OAuth. */
export function useAuthFlow(): AuthFlow {
  const { isLoaded: isUserLoaded } = useUser()
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authView, setAuthView] = useState<AuthView>('form')
  const [form, setForm] = useState<AuthForm>({ name: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)
  const [terms, setTerms] = useState(true)

  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setPendingVerification(false)
    setStatus('')
  }

  const handleGoBackToForm = () => {
    setAuthView('form')
    setStatus('')
  }

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      if (authMode === 'login') {
        if (!isSignInLoaded) return

        const result = await signIn.create({
          identifier: form.email,
          password: form.password,
        })

        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          setStatus('Sesión iniciada correctamente.')
        } else {
          setStatus('No se pudo completar el inicio de sesión.')
        }
      } else {
        if (!isSignUpLoaded) return
        if (!terms) {
          setStatus('Tienes que aceptar los términos para continuar.')
          return
        }

        const result = await signUp.create({
          emailAddress: form.email,
          password: form.password,
          firstName: form.name,
        })

        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          setStatus('Cuenta creada correctamente.')
        } else {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setPendingVerification(true)
          setStatus('Te enviamos un código de verificación a tu correo.')
        }
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'Hubo un error al conectar con Clerk.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignUpLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        setStatus('Cuenta verificada correctamente.')
      } else {
        setStatus('El código no es válido, intenta nuevamente.')
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo verificar el código.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotRequestSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignInLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: resetEmail })
      setAuthView('forgot-reset')
      setStatus('Te enviamos un código para restablecer tu contraseña.')
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo enviar el código de recuperación.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotResetSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignInLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      })

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        setStatus('Contraseña actualizada. Sesión iniciada.')
        setAuthView('form')
      } else {
        setStatus('El código no es válido, intenta nuevamente.')
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo restablecer la contraseña.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (!isSignInLoaded) return

    setStatus('')

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: window.location.origin,
      })
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo conectar con Google.'))
    }
  }

  return {
    isUserLoaded,
    authMode,
    authView,
    pendingVerification,
    status,
    isSubmitting,
    form,
    code,
    resetEmail,
    resetCode,
    newPassword,
    remember,
    terms,
    setCode,
    setResetEmail,
    setResetCode,
    setNewPassword,
    toggleRemember: () => setRemember((previous) => !previous),
    toggleTerms: () => setTerms((previous) => !previous),
    openForgotPassword: () => setAuthView('forgot-request'),
    handleModeChange,
    handleGoBackToForm,
    handleFieldChange,
    handleSubmit,
    handleVerify,
    handleForgotRequestSubmit,
    handleForgotResetSubmit,
    handleGoogleAuth,
  }
}
