import { useId } from "react";
import { MapPin, PackageCheck } from "lucide-react";

type WaterBabyAvatarProps = {
  state: "home" | "exploring" | "ready";
  className?: string;
  fillPercent?: number;
  holdFeedback?: boolean;
};

export function WaterBabyAvatar({
  state,
  className = "h-[54px] w-[46px]",
  fillPercent,
  holdFeedback = false
}: WaterBabyAvatarProps) {
  const id = useId().replace(/:/g, "");
  const hasHydrationFill = typeof fillPercent === "number";
  const normalizedFill = Math.min(100, Math.max(0, fillPercent ?? 0));
  const waterTop = 70 - normalizedFill * 0.67;

  return (
    <span className={`relative block ${className}`}>
      <svg
        viewBox="0 0 64 76"
        aria-hidden="true"
        className="h-full w-full overflow-visible drop-shadow-[0_5px_8px_rgba(8,47,73,0.38)]"
      >
        <defs>
          <clipPath id={`water-baby-${id}`}>
            <path d="M32 3C25 16 10 30 10 47c0 13 9.8 23 22 23s22-10 22-23C54 30 39 16 32 3Z" />
          </clipPath>
          <linearGradient id={`water-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="58%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          {holdFeedback ? (
            <linearGradient id={`water-hold-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f7ff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#a5e3ff" stopOpacity="0.65" />
            </linearGradient>
          ) : null}
        </defs>
        <path
          d="M32 3C25 16 10 30 10 47c0 13 9.8 23 22 23s22-10 22-23C54 30 39 16 32 3Z"
          className={hasHydrationFill ? "fill-sky-100/55 stroke-white/90" : "fill-sky-100/95 stroke-white/90"}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {hasHydrationFill ? (
          <g clipPath={`url(#water-baby-${id})`}>
            <rect
              x="8"
              y={waterTop}
              width="48"
              height={72 - waterTop}
              fill={`url(#water-fill-${id})`}
              className="transition-all duration-700 ease-out"
            />
            <path
              d={`M8 ${waterTop + 1.5} Q20 ${waterTop - 1.5} 32 ${waterTop + 1.5} T56 ${waterTop + 1.5} V76 H8Z`}
              className="fill-white/16 transition-all duration-700 ease-out"
            />
          </g>
        ) : null}
        {holdFeedback ? (
          <g clipPath={`url(#water-baby-${id})`}>
            <rect
              x="8" y="3" width="48" height="69"
              fill={`url(#water-hold-${id})`}
              className="pet-hold-fill"
            />
          </g>
        ) : null}
        <circle cx="25" cy="43" r="2.5" className="fill-sky-950" />
        <circle cx="39" cy="43" r="2.5" className="fill-sky-950" />
        <path
          d="M26 53c3.5 3 8.5 3 12 0"
          fill="none"
          className="stroke-sky-950"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 31c3-4 7-7 12-10"
          fill="none"
          className="stroke-white/80"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {state === "ready" ? (
        <span className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full bg-emerald-300 text-emerald-950 shadow-sm">
          <PackageCheck size={13} strokeWidth={2.4} />
        </span>
      ) : state === "exploring" ? (
        <span className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-sm">
          <MapPin size={13} strokeWidth={2.4} />
        </span>
      ) : null}
    </span>
  );
}
