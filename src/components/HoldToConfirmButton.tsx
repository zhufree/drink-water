import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const HOLD_DURATION_MS = 1200;

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
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const triggeredRef = useRef(false);
  const resetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (resetRef.current !== null) {
        window.clearTimeout(resetRef.current);
      }
    };
  }, []);

  const cancel = () => {
    if (!holdingRef.current || triggeredRef.current) {
      return;
    }
    holdingRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    startedAtRef.current = null;
    setProgress(0);
  };

  const finish = () => {
    if (!holdingRef.current || triggeredRef.current) {
      return;
    }
    holdingRef.current = false;
    frameRef.current = null;
    startedAtRef.current = null;
    triggeredRef.current = true;
    setProgress(100);
    onComplete();
    resetRef.current = window.setTimeout(() => {
      triggeredRef.current = false;
      resetRef.current = null;
      setProgress(0);
    }, 180);
  };

  const advance = (timestamp: number) => {
    if (startedAtRef.current === null || triggeredRef.current) {
      return;
    }
    const nextProgress = Math.min(
      ((timestamp - startedAtRef.current) / HOLD_DURATION_MS) * 100,
      100
    );
    setProgress(nextProgress);
    if (nextProgress >= 100) {
      finish();
      return;
    }
    frameRef.current = requestAnimationFrame(advance);
  };

  const begin = (event?: PointerEvent<HTMLButtonElement>) => {
    if (disabled || triggeredRef.current || holdingRef.current) {
      return;
    }
    if (event) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    holdingRef.current = true;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    startedAtRef.current = performance.now();
    setProgress(0);
    frameRef.current = requestAnimationFrame(advance);
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
      className={className}
    >
      <span
        className={`absolute inset-y-0 left-0 ${progressClassName}`}
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      <span className="relative z-10 block">{children}</span>
    </button>
  );
}
