import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthMode } from '../shared/types/auth';
import type { SessionState } from '../shared/types/session';

type AuthStore = {
  authMode: AuthMode;
  session: SessionState | null;
  pendingSession: SessionState | null;
  hasHydrated: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  rememberMe: boolean;
  setAuthMode: (mode: AuthMode) => void;
  setSession: (session: SessionState | null) => void;
  setPendingSession: (session: SessionState | null) => void;
  setHasHydrated: (value: boolean) => void;
  updateAccessToken: (accessToken: string) => void;
  setStatusMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  setRememberMe: (value: boolean) => void;
  resetFlow: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      authMode: 'login',
      session: null,
      pendingSession: null,
      hasHydrated: false,
      statusMessage: null,
      errorMessage: null,
      rememberMe: true,
      setAuthMode: (mode) => set({ authMode: mode }),
      setSession: (session) => set({ session }),
      setPendingSession: (pendingSession) => set({ pendingSession }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      updateAccessToken: (accessToken) =>
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                accessToken,
              }
            : state.session,
          pendingSession:
            !state.session && state.pendingSession
              ? {
                  ...state.pendingSession,
                  accessToken,
                }
              : state.pendingSession,
        })),
      setStatusMessage: (statusMessage) => set({ statusMessage }),
      setErrorMessage: (errorMessage) => set({ errorMessage }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      resetFlow: () =>
        set({
          pendingSession: null,
          statusMessage: null,
          errorMessage: null,
        }),
      logout: () =>
        set({
          session: null,
          pendingSession: null,
          statusMessage: null,
          errorMessage: null,
          authMode: 'login',
        }),
    }),
    {
      name: 'chat-messenger-auth',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<AuthStore>;
        return {
          ...state,
          session: state.rememberMe ? state.session ?? null : null,
          pendingSession: null,
          hasHydrated: false,
          statusMessage: null,
          errorMessage: null,
        };
      },
      partialize: (state) => ({
        rememberMe: state.rememberMe,
        authMode: state.authMode,
        session: state.rememberMe ? state.session : null,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
