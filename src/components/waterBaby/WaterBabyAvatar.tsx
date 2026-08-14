import { MapPin, PackageCheck } from "lucide-react";

type WaterBabyAvatarProps = {
  state: "home" | "exploring" | "ready";
  className?: string;
};

export function WaterBabyAvatar({
  state,
  className = "h-[54px] w-[46px]"
}: WaterBabyAvatarProps) {
  return (
    <span className={`relative block ${className}`}>
      <svg
        viewBox="0 0 64 76"
        aria-hidden="true"
        className="h-full w-full overflow-visible drop-shadow-[0_5px_8px_rgba(8,47,73,0.38)]"
      >
        <path
          d="M32 3C25 16 10 30 10 47c0 13 9.8 23 22 23s22-10 22-23C54 30 39 16 32 3Z"
          className="fill-sky-100/95 stroke-white/90"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
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
