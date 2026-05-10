"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  /** Shown under the envelope */
  message?: string;
  /** Smaller envelope for inline / PDF slot */
  variant?: "default" | "compact";
  /** Show “Tap to open again” hint */
  showHint?: boolean;
  className?: string;
};

export function EnvelopeLoader({
  message = "Opening your envelope…",
  variant = "default",
  showHint = true,
  className = "",
}: Props) {
  const [interact, setInteract] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBurst = useCallback(() => {
    if (burstTimer.current) clearTimeout(burstTimer.current);
    setInteract(true);
    burstTimer.current = setTimeout(() => {
      setInteract(false);
      burstTimer.current = null;
    }, 980);
  }, []);

  const compact = variant === "compact";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <button
        type="button"
        className={`envelope-loader ${compact ? "envelope-loader--compact" : ""} ${interact ? "envelope-loader--interact" : ""}`}
        onClick={triggerBurst}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerBurst();
          }
        }}
        aria-label="Replay opening envelope animation"
      >
        <span className="envelope-loader__scene">
          <span className="envelope-loader__letter" aria-hidden />
          <span className="envelope-loader__pocket" aria-hidden />
          <span className="envelope-loader__flap" aria-hidden>
            <span className="envelope-loader__flap-face" />
          </span>
          <span className="envelope-loader__seal" aria-hidden />
        </span>
      </button>
      <div className="max-w-xs px-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>
        {showHint ? (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Click</span>
            <span className="sm:hidden">Tap</span> the envelope to replay
          </p>
        ) : null}
      </div>
    </div>
  );
}
