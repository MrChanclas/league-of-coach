import type { AuthCheckboxProps } from '../../types/components'

export function AuthCheckbox({ checked, onToggle, label, variant }: AuthCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={variant === 'terms' ? 'auth-checkbox-row auth-checkbox-row--terms' : 'auth-checkbox-row'}
      onClick={onToggle}
    >
      <span className={checked ? 'auth-checkbox-box checked' : 'auth-checkbox-box'}>
        {checked && <span>✓</span>}
      </span>
      <span className={variant === 'terms' ? 'auth-checkbox-label auth-checkbox-label--terms' : 'auth-checkbox-label'}>
        {label}
      </span>
    </button>
  )
}

// Google's own brand colors, so they stay as literals instead of theme tokens.
export function GoogleIcon() {
  return (
    <svg className="auth-social-mark" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

// Discord's own brand color ("blurple"), so it stays a literal like Google's.
export function DiscordIcon() {
  return (
    <svg className="auth-social-mark" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.85a13.6 13.6 0 0 0-.63 1.29 18.4 18.4 0 0 0-5.53 0 13.6 13.6 0 0 0-.64-1.3A19.7 19.7 0 0 0 3.68 4.38C.55 9.05-.3 13.6.12 18.09a19.9 19.9 0 0 0 6.04 3.05 14.7 14.7 0 0 0 1.29-2.1 12.9 12.9 0 0 1-2.04-.97l.5-.39a14.2 14.2 0 0 0 12.18 0l.5.39c-.65.39-1.33.71-2.04.98.37.74.8 1.44 1.29 2.09a19.8 19.8 0 0 0 6.05-3.05c.5-5.2-.84-9.71-3.57-13.72ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.09 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.19 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"
      />
    </svg>
  )
}

export function OrDivider() {
  return (
    <div className="auth-oredivider">
      <span className="auth-oredivider-line" />
      <span>O CON TU CORREO</span>
      <span className="auth-oredivider-line" />
    </div>
  )
}

export function ClerkBadge() {
  return (
    <span className="auth-clerk-badge">
      <span />
      <span>SEGURO CON CLERK</span>
    </span>
  )
}
