import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const HOLD_DURATION_MS = 1200;
const CANCEL_DURATION_MS = 120;

type HoldPhase = "idle" | "holding" | "cooldown";

type HoldToConfirmButtonProps = {
  onComplete: () => void;
  ariaLabel: string;
  className: string;
  progressClassName: string;
  disabled?: boolean;
  children: ReactNode;
};

export function HoldToConfirmButton({
  onComplete,
  ariaLabel,
  className,
  progressClassName,
  disabled = false,
  children
}: HoldToConfirmButtonProps) {
  const [phase, setPhase] = useState<HoldPhase>("idle");
  const holdTimerRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const triggeredRef = useRef(false);
  const resetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (resetRef.current !== null) {
        window.clearTimeout(resetRef.current);
      }
    };
  }, []);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const cancel = () => {
    if (!holdingRef.current) {
      return;
    }
    holdingRef.current = false;
    clearHoldTimer();
    setPhase("idle");
  };

  const finish = () => {
    if (!holdingRef.current || triggeredRef.current) {
      return;
    }
    holdingRef.current = false;
    holdTimerRef.current = null;
    triggeredRef.current = true;
    // The compositor animation has reached the end by now. Clear it without a
    // reverse transition so completion cannot produce a delayed one-frame flash.
    setPhase("cooldown");
    onComplete();
    resetRef.current = window.setTimeout(() => {
      triggeredRef.current = false;
      resetRef.current = null;
      setPhase("idle");
    }, 180);
  };

  const begin = (event?: PointerEvent<HTMLButtonElement>) => {
    if (disabled || triggeredRef.current || holdingRef.current) {
      return;
    }
    if (event) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    holdingRef.current = true;
    clearHoldTimer();
    setPhase("holding");
    holdTimerRef.current = window.setTimeout(finish, HOLD_DURATION_MS);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        begin(event);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        cancel();
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        cancel();
      }}
      onLostPointerCapture={cancel}
      onBlur={cancel}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          event.preventDefault();
          begin();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cancel();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={ariaLabel}
      data-hold-state={phase}
      className={className}
    >
      <span
        className={`pointer-events-none absolute inset-0 ${progressClassName}`}
        style={{
          transform: phase === "holding" ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left center",
          transitionProperty: "transform",
          transitionDuration:
            phase === "holding"
              ? `${HOLD_DURATION_MS}ms`
              : phase === "idle"
                ? `${CANCEL_DURATION_MS}ms`
                : "0ms",
          transitionTimingFunction: phase === "holding" ? "linear" : "ease-out",
          willChange: phase === "holding" ? "transform" : undefined
        }}
        aria-hidden="true"
      />
      <span className="relative z-10 block">{children}</span>
    </button>
  );
}
