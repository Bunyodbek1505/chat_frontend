import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center p-4 sm:p-6">
          <div className="grid w-full max-w-[520px] gap-4 rounded-[30px] border border-slate-200/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(29,55,112,0.14)] backdrop-blur-xl">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-app-accent)]">
              Application error
            </p>
            <h1 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-none tracking-[-0.05em] text-[color:var(--color-app-text)]">
              Something broke on the front-end
            </h1>
            <p className="text-[color:var(--color-app-muted)]">
              {this.state.message ?? 'Please reload the page and try again.'}
            </p>
            <button
              className="inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] px-5 py-3.5 font-extrabold text-white shadow-[0_18px_30px_rgba(17,74,196,0.24)] transition hover:-translate-y-0.5"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
