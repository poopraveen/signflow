"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  envelopePdfUrl,
  fetchEnvelope,
  saveEnvelopeToServer,
  sendEnvelopeNow,
} from "@/lib/envelope-client";
import type { InviteLink } from "@/lib/envelope-client";

const PdfPageWithOverlay = dynamic(
  () =>
    import("@/components/PdfPageWithOverlay").then((m) => ({ default: m.PdfPageWithOverlay })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center text-slate-500">Loading PDF viewer…</div>
    ),
  },
);
import type { Envelope, Field, FieldType } from "@/lib/types";

type DragState = {
  fieldId: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  rectWidth: number;
  rectHeight: number;
};

export default function PrepareEnvelopePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [tool, setTool] = useState<FieldType | null>(null);
  const [signerPick, setSignerPick] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const overlayWrapRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<Envelope | null>(null);

  const signerId = signerPick ?? envelope?.signers[0]?.id ?? "";
  const pdfUrl = id ? envelopePdfUrl(id) : null;

  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const e = await fetchEnvelope(id);
        if (cancelled) return;
        if (!e) router.replace("/dashboard");
        else {
          setEnvelope(e);
          envelopeRef.current = e;
        }
      } catch {
        if (!cancelled) router.replace("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const persist = useCallback(async (next: Envelope) => {
    setEnvelope(next);
    envelopeRef.current = next;
    await saveEnvelopeToServer(next);
  }, []);

  const onPageClick = (pageIndex: number, x: number, y: number) => {
    void (async () => {
      const env = envelopeRef.current;
      if (!env || !tool || !signerId) return;
      const defaults: Record<FieldType, { w: number; h: number }> = {
        signature: { w: 0.22, h: 0.08 },
        date: { w: 0.18, h: 0.06 },
        text: { w: 0.28, h: 0.06 },
      };
      const { w, h } = defaults[tool];
      let nx = x - w / 2;
      let ny = y - h / 2;
      nx = Math.max(0, Math.min(1 - w, nx));
      ny = Math.max(0, Math.min(1 - h, ny));

      const field: Field = {
        id: nanoid(),
        type: tool,
        pageIndex,
        signerId,
        x: nx,
        y: ny,
        width: w,
        height: h,
      };
      await persist({ ...env, fields: [...env.fields, field] });
    })();
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (ev: PointerEvent) => {
      const env = envelopeRef.current;
      if (!env) return;
      const dx = (ev.clientX - drag.startClientX) / drag.rectWidth;
      const dy = (ev.clientY - drag.startClientY) / drag.rectHeight;
      let nx = drag.origX + dx;
      let ny = drag.origY + dy;
      const f = env.fields.find((x) => x.id === drag.fieldId);
      if (!f) return;
      nx = Math.max(0, Math.min(1 - f.width, nx));
      ny = Math.max(0, Math.min(1 - f.height, ny));
      const next = {
        ...env,
        fields: env.fields.map((x) =>
          x.id === drag.fieldId ? { ...x, x: nx, y: ny } : x,
        ),
      };
      envelopeRef.current = next;
      setEnvelope(next);
    };

    const onUp = () => {
      setDrag(null);
      const latest = envelopeRef.current;
      if (latest) void saveEnvelopeToServer(latest).catch(() => {});
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  const onFieldPointerDown = (fieldId: string, e: React.PointerEvent) => {
    const el = overlayWrapRef.current?.querySelector("[data-pdf-overlay]") as HTMLElement | null;
    const rect = el?.getBoundingClientRect();
    const env = envelopeRef.current;
    if (!rect || !env) return;
    const f = env.fields.find((x) => x.id === fieldId);
    if (!f) return;
    e.preventDefault();
    setDrag({
      fieldId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: f.x,
      origY: f.y,
      rectWidth: rect.width,
      rectHeight: rect.height,
    });
  };

  const removeField = (fieldId: string) => {
    void (async () => {
      const env = envelopeRef.current;
      if (!env) return;
      await persist({
        ...env,
        fields: env.fields.filter((f) => f.id !== fieldId),
      });
    })();
  };

  const send = () => {
    void (async () => {
      const env = envelopeRef.current;
      if (!env || env.fields.length === 0) return;
      setSendError(null);
      try {
        await saveEnvelopeToServer(env);
        const result = await sendEnvelopeNow(id);
        setEnvelope(result.envelope);
        envelopeRef.current = result.envelope;
        setInviteLinks(result.inviteLinks);
        setSendOpen(true);
      } catch (e) {
        setSendError(e instanceof Error ? e.message : "Send failed");
      }
    })();
  };

  if (!envelope) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Prepare</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{envelope.title}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signers</p>
          <select
            value={signerId}
            onChange={(e) => setSignerPick(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {envelope.signers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add field</p>
          <p className="mt-1 text-xs text-slate-500">Choose a tool, then click on the page.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["signature", "Signature"],
                ["date", "Date"],
                ["text", "Text"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTool(tool === k ? null : k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tool === k
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {envelope.fields.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fields</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm">
              {envelope.fields.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800"
                >
                  <span className="truncate capitalize">
                    {f.type} · p{f.pageIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="shrink-0 text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={send}
            disabled={envelope.fields.length === 0}
            className="rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Send envelope
          </button>
          {sendError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {sendError}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Sending emails each signer their own link (configure Gmail in{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env.local</code>
            ). Links stay valid until you change signers.
          </p>
        </div>
      </aside>

      <div ref={overlayWrapRef} className="min-w-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={numPages != null && page >= numPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              Next
            </button>
          </div>
          {tool && (
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              Placing: {tool} — click on the document
            </span>
          )}
        </div>
        <div className="inline-block">
          <PdfPageWithOverlay
            fileUrl={pdfUrl}
            pageNumber={page}
            numPages={numPages}
            onNumPages={setNumPages}
            fields={envelope.fields}
            mode="prepare"
            selectedTool={tool}
            activeSignerId={signerId}
            onPageClick={onPageClick}
            onFieldPointerDown={onFieldPointerDown}
          />
        </div>
      </div>

      {sendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Envelope sent</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Personal links (also emailed if Gmail is configured):
            </p>
            <ul className="mt-3 space-y-3">
              {inviteLinks.map((link) => (
                <li
                  key={link.email}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {link.name} <span className="font-normal text-slate-500">&lt;{link.email}&gt;</span>
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-400">{link.url}</p>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(link.url)}
                    className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Copy link
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Link
                href="/dashboard"
                className="flex flex-1 items-center justify-center rounded-lg border border-slate-300 py-2 text-center text-sm font-medium dark:border-slate-600"
              >
                Dashboard
              </Link>
              {inviteLinks[0] && (
                <Link
                  href={inviteLinks[0].url}
                  className="flex flex-1 items-center justify-center rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Open first signer
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSendOpen(false)}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
