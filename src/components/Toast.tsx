import { CheckCircle2, Info } from "lucide-react";

export type ToastTone = "info" | "success";

type ToastProps = {
  message: string;
  tone?: ToastTone;
};

export function Toast({ message, tone = "info" }: ToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : Info;
  const toneClass =
    tone === "success"
      ? "border-emerald-300/35 bg-emerald-950/92 text-emerald-50"
      : "border-cyan-200/20 bg-slate-950/92 text-cyan-50";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[min(340px,calc(100vw-32px))] items-center gap-2.5 rounded-[16px] border px-4 py-3 text-sm shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-md ${toneClass}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span>{message}</span>
    </div>
  );
}
