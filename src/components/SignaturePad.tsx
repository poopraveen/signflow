"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
};

export function SignaturePad({ onApply, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const endStroke = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    resize();
  };

  const apply = () => {
    const c = canvasRef.current;
    if (!c || !hasInk) return;
    onApply(c.toDataURL("image/png"));
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 sm:p-5">
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Sign in the box</p>
      <canvas
        ref={canvasRef}
        className="h-44 w-full cursor-crosshair touch-none rounded-lg border border-dashed border-slate-300 bg-slate-50 sm:h-40 dark:border-slate-600 dark:bg-slate-800"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={clear}
          className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!hasInk}
          onClick={apply}
          className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Apply signature
        </button>
      </div>
    </div>
  );
}
