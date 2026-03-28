import { useState, type FormEvent } from 'react';
import type { AuthFormState } from '../models/auth.model';
import type { AuthMode } from '../../../shared/types/auth';

type Props = {
  authMode: AuthMode;
  authForm: AuthFormState;
  loading: boolean;
  error: string | null;
  statusMessage: string | null;
  rememberMe: boolean;
  onModeChange: (mode: AuthMode) => void;
  onFormChange: (patch: Partial<AuthFormState>) => void;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const shellClass =
  'rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(29,55,112,0.14)] backdrop-blur-xl sm:p-7';
const inputClass =
  'w-full rounded-[18px] border border-transparent bg-slate-50 px-4 py-3.5 text-[color:var(--color-app-text)] shadow-[inset_0_0_0_1px_rgba(18,38,79,0.05)] outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_4px_rgba(30,99,233,0.12),inset_0_0_0_1px_rgba(30,99,233,0.14)]';
const labelClass =
  'text-[0.78rem] font-extrabold uppercase tracking-[0.18em] text-slate-700/80';
const primaryButtonClass =
  'inline-flex w-full items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] px-5 py-3.5 font-extrabold text-white shadow-[0_18px_30px_rgba(17,74,196,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70';
const secondaryButtonClass =
  'rounded-2xl bg-white/90 px-4 py-3 font-extrabold text-[color:var(--color-app-accent)] shadow-[inset_0_0_0_1px_rgba(18,38,79,0.08)] transition hover:-translate-y-0.5';

export function AuthFormCard({
  authMode,
  authForm,
  loading,
  error,
  statusMessage,
  rememberMe,
  onModeChange,
  onFormChange,
  onRememberMeChange,
  onSubmit,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <article className={shellClass}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] leading-none tracking-[-0.05em] text-[color:var(--color-app-text)]">
            {authMode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-[color:var(--color-app-muted)]">
            {authMode === 'login'
              ? 'Enter your credentials. Face verification runs automatically on every login.'
              : 'Register a new user with password confirmation.'}
          </p>
        </div>
      </div>

      <div
        className="inline-flex rounded-[18px] border border-slate-200/80 bg-slate-100/90 p-1.5"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          className={`rounded-[14px] px-4 py-3 font-bold transition ${
            authMode === 'login'
              ? 'bg-white text-[color:var(--color-app-text)] shadow-[0_8px_22px_rgba(29,55,112,0.12)]'
              : 'text-[color:var(--color-app-muted)]'
          }`}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`rounded-[14px] px-4 py-3 font-bold transition ${
            authMode === 'register'
              ? 'bg-white text-[color:var(--color-app-text)] shadow-[0_8px_22px_rgba(29,55,112,0.12)]'
              : 'text-[color:var(--color-app-muted)]'
          }`}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className={labelClass}>Username</span>
          <input
            className={inputClass}
            value={authForm.username}
            onChange={(event) => onFormChange({ username: event.target.value })}
            placeholder="alex_rivera"
            autoComplete="username"
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Password</span>
          <div className="flex gap-2.5">
            <input
              className={`${inputClass} flex-1`}
              type={showPassword ? 'text' : 'password'}
              value={authForm.password}
              onChange={(event) => onFormChange({ password: event.target.value })}
              placeholder="********"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {authMode === 'register' ? (
          <label className="grid gap-2">
            <span className={labelClass}>Confirm password</span>
            <div className="flex gap-2.5">
              <input
                className={`${inputClass} flex-1`}
                type={showConfirmPassword ? 'text' : 'password'}
                value={authForm.confirmPassword}
                onChange={(event) => onFormChange({ confirmPassword: event.target.value })}
                placeholder="********"
                autoComplete="new-password"
              />
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm text-[color:var(--color-app-muted)]">
          <label className="inline-flex items-center gap-2.5">
            <input
              className="h-4 w-4 accent-[var(--color-app-accent)]"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => onRememberMeChange(event.target.checked)}
            />
            <span>Keep me signed in on this device</span>
          </label>
          <span className="font-bold text-[color:var(--color-app-accent)]">
            {rememberMe ? 'Session will be restored after refresh' : 'Session will end after refresh'}
          </span>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-[color:var(--color-app-accent)]">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-[color:var(--color-app-danger)]">
            {error}
          </div>
        ) : null}

        <button className={primaryButtonClass} type="submit" disabled={loading}>
          {loading ? 'Processing...' : authMode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-[color:var(--color-app-muted)]">
        {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          className="bg-transparent p-0 font-bold text-[color:var(--color-app-accent)]"
          onClick={() => onModeChange(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </article>
  );
}
