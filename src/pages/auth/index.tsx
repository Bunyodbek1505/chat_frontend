import { AuthFormCard } from './components/AuthFormCard';
import { FaceVerifyCard } from './components/FaceVerifyCard';
import { useAuthPageController } from './hooks/useAuthPageController';
import { logoutAccount } from './api/auth.api';

export function AuthPage() {
  const controller = useAuthPageController();

  if (controller.pendingSession && !controller.session) {
    return (
      <main className="grid min-h-screen place-items-center p-4 sm:p-6">
        <FaceVerifyCard
          username={controller.pendingSession.user.username}
          loading={controller.loading}
          error={controller.errorMessage}
          statusMessage={controller.statusMessage}
          videoRef={controller.videoRef}
          canvasRef={controller.canvasRef}
          onCapture={controller.handleFaceVerify}
          onBack={() => {
            void logoutAccount().catch(() => undefined);
            controller.setPendingSession(null);
            controller.resetFlow();
            controller.setCapturedFace('');
            controller.setAuthMode('login');
            controller.setErrorMessage(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <section className="w-full max-w-[560px]">
        <AuthFormCard
          authMode={controller.authMode}
          authForm={controller.authForm}
          loading={controller.loading}
          error={controller.errorMessage}
          statusMessage={controller.statusMessage}
          rememberMe={controller.rememberMe}
          onModeChange={(mode) => {
            controller.setAuthMode(mode);
            controller.setErrorMessage(null);
          }}
          onFormChange={(patch) => controller.setAuthForm((current) => ({ ...current, ...patch }))}
          onRememberMeChange={controller.setRememberMe}
          onSubmit={controller.authMode === 'login' ? controller.handleLogin : controller.handleRegister}
        />
      </section>
    </main>
  );
}
