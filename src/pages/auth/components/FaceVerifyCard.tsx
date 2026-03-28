import type { RefObject } from 'react';

type Props = {
  username: string;
  loading: boolean;
  error: string | null;
  statusMessage: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onCapture: () => Promise<void>;
  onBack: () => void;
};

const shellClass =
  'w-full max-w-[720px] rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_24px_60px_rgba(29,55,112,0.12)] sm:p-6';

export function FaceVerifyCard({ username, loading, error, statusMessage, videoRef, canvasRef, onCapture, onBack }: Props) {
  return (
    <section className={shellClass}>
      <div className="mb-4">
        <h1 className="font-display text-3xl tracking-[-0.04em] text-[color:var(--color-app-text)] sm:text-4xl">Yuzni tasdiqlash</h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-app-muted)] sm:text-base">
          <strong>@{username}</strong> uchun kamera yoqildi. Yuzni markazga keltiring va rasmga oling.
        </p>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-slate-950">
        <div className="relative aspect-[4/5] w-full bg-slate-900 sm:aspect-[16/10]">
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
          <div className="pointer-events-none absolute inset-0 border-[12px] border-black/10" />
        </div>
      </div>

      <canvas ref={canvasRef} className="sr-only" />

      {statusMessage ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-[color:var(--color-app-accent)]">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-[color:var(--color-app-danger)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] px-5 py-3.5 font-extrabold text-white shadow-[0_18px_30px_rgba(17,74,196,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={onCapture}
          disabled={loading}
        >
          {loading ? 'Tekshirilmoqda...' : 'Rasmga olish'}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-[18px] bg-white px-5 py-3.5 font-bold text-[color:var(--color-app-text)] shadow-[inset_0_0_0_1px_rgba(18,38,79,0.08)] transition hover:-translate-y-0.5 sm:min-w-[180px]"
          onClick={onBack}
        >
          Ortga qaytish
        </button>
      </div>
    </section>
  );
}
