import { useAuthStore } from './store/auth.store';
import { AuthPage } from './pages/auth';
import { HomePage } from './pages/home';

function App() {
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <main className="grid min-h-screen place-items-center p-4 sm:p-6">
        <div className="rounded-[24px] border border-slate-200/70 bg-white/80 px-6 py-5 text-sm font-medium text-slate-600 shadow-[0_24px_80px_rgba(29,55,112,0.14)] backdrop-blur-xl">
          Restoring your session...
        </div>
      </main>
    );
  }

  return session ? <HomePage /> : <AuthPage />;
}

export default App;
