type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-[min(320px,calc(100vw-32px))] rounded-[16px] border border-cyan-200/20 bg-slate-950/92 px-4 py-3 text-sm text-cyan-50 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-md"
    >
      {message}
    </div>
  );
}
