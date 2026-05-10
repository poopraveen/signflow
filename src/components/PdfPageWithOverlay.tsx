"use client";

import { useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { EnvelopeLoader } from "@/components/EnvelopeLoader";
import type { Field } from "@/lib/types";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PAGE_WIDTH = 720;

type Props = {
  fileUrl: string | null;
  pageNumber: number;
  numPages: number | null;
  onNumPages: (n: number) => void;
  fields: Field[];
  mode: "prepare" | "sign" | "view";
  activeSignerId?: string;
  selectedTool?: "signature" | "date" | "text" | null;
  onPageClick?: (pageIndex: number, x: number, y: number) => void;
  onFieldPointerDown?: (fieldId: string, e: React.PointerEvent) => void;
  onFieldClick?: (fieldId: string) => void;
};

export function PdfPageWithOverlay({
  fileUrl,
  pageNumber,
  numPages,
  onNumPages,
  fields,
  mode,
  activeSignerId,
  selectedTool,
  onPageClick,
  onFieldPointerDown,
  onFieldClick,
}: Props) {
  const pageFields = useMemo(
    () => fields.filter((f) => f.pageIndex === pageNumber - 1),
    [fields, pageNumber],
  );

  if (!fileUrl) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-900">
        No document loaded
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages: n }) => onNumPages(n)}
      loading={
        <div className="flex h-96 items-center justify-center py-8">
          <EnvelopeLoader variant="compact" message="Loading PDF…" showHint={false} />
        </div>
      }
      error={
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Could not load PDF. Try another file.
        </div>
      }
    >
      <div className="relative inline-block max-w-full shadow-lg">
        <Page
          pageNumber={pageNumber}
          width={PAGE_WIDTH}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
        <div
          data-pdf-overlay
          className={`absolute inset-0 ${mode === "prepare" && selectedTool ? "cursor-crosshair" : ""}`}
          onClick={(e) => {
            if (mode !== "prepare" || !selectedTool || !onPageClick) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            onPageClick(pageNumber - 1, x, y);
          }}
        >
          {pageFields.map((f) => {
            const isMine =
              mode === "sign" && activeSignerId && f.signerId === activeSignerId;
            const filled = Boolean(f.value);
            return (
              <button
                key={f.id}
                type="button"
                className={`absolute flex items-center justify-center rounded border-2 text-xs font-medium transition-colors ${
                  f.type === "signature"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100"
                    : f.type === "date"
                      ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                      : "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                } ${isMine && !filled ? "ring-2 ring-indigo-400 ring-offset-2" : ""} ${
                  mode === "sign" && isMine && !filled ? "cursor-pointer hover:bg-white/40" : ""
                } ${mode === "prepare" ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{
                  left: `${f.x * 100}%`,
                  top: `${f.y * 100}%`,
                  width: `${f.width * 100}%`,
                  height: `${f.height * 100}%`,
                }}
                onPointerDown={(e) => {
                  if (mode === "prepare") {
                    e.stopPropagation();
                    e.preventDefault();
                    onFieldPointerDown?.(f.id, e);
                  }
                }}
                onClick={(e) => {
                  if (mode === "prepare") {
                    e.stopPropagation();
                    return;
                  }
                  if (mode === "sign" && isMine && !filled) {
                    e.stopPropagation();
                    onFieldClick?.(f.id);
                  }
                }}
              >
                {filled && f.type === "signature" && f.value ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.value} alt="" className="max-h-full max-w-full object-contain" />
                ) : filled ? (
                  <span className="truncate px-1">{f.value}</span>
                ) : (
                  <span className="pointer-events-none px-1 text-[10px] uppercase opacity-80">
                    {f.type === "signature"
                      ? "Sign"
                      : f.type === "date"
                        ? "Date"
                        : "Text"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {numPages != null && (
        <p className="mt-2 text-center text-sm text-slate-500">
          Page {pageNumber} of {numPages}
        </p>
      )}
    </Document>
  );
}
