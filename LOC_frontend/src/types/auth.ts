export type ClerkErrorLike = {
  errors?: { message?: string; longMessage?: string }[]
}

export type AuthMode = 'login' | 'register'
export type AuthView = 'form' | 'forgot-request' | 'forgot-reset'

export type AuthForm = {
  name: string
  email: string
  password: string
}

type FormSubmitHandler = (event: React.SubmitEvent<HTMLFormElement>) => Promise<void>

export type AuthFlow = {
  isUserLoaded: boolean
  authMode: AuthMode
  authView: AuthView
  pendingVerification: boolean
  status: string
  isSubmitting: boolean
  form: AuthForm
  code: string
  resetEmail: string
  resetCode: string
  newPassword: string
  remember: boolean
  terms: boolean
  setCode: (value: string) => void
  setResetEmail: (value: string) => void
  setResetCode: (value: string) => void
  setNewPassword: (value: string) => void
  toggleRemember: () => void
  toggleTerms: () => void
  openForgotPassword: () => void
  handleModeChange: (mode: AuthMode) => void
  handleGoBackToForm: () => void
  handleFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: FormSubmitHandler
  handleVerify: FormSubmitHandler
  handleForgotRequestSubmit: FormSubmitHandler
  handleForgotResetSubmit: FormSubmitHandler
  handleGoogleAuth: () => Promise<void>
  handleDiscordAuth: () => Promise<void>
}
