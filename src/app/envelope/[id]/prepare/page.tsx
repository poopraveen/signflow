"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { EnvelopeLoader } from "@/components/EnvelopeLoader";
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
      <div className="flex h-96 items-center justify-center py-8">
        <EnvelopeLoader variant="compact" message="Opening PDF…" />
      </div>
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
  const [sending, setSending] = useState(false);
  const [sendMeta, setSendMeta] = useState<{
    gmailConfigured: boolean;
    emailsAttempted?: boolean;
    emailResults?: { email: string; ok: boolean; error?: string }[];
  } | null>(null);
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
      setSending(true);
      try {
        await saveEnvelopeToServer(env);
        const result = await sendEnvelopeNow(id);
        setEnvelope(result.envelope);
        envelopeRef.current = result.envelope;
        setInviteLinks(result.inviteLinks);
        setSendMeta({
          gmailConfigured: result.gmailConfigured,
          emailsAttempted: result.emailsAttempted,
          emailResults: result.emailResults,
        });
        setSendOpen(true);
      } catch (e) {
        setSendError(e instanceof Error ? e.message : "Send failed");
      } finally {
        setSending(false);
      }
    })();
  };

  if (!envelope) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <EnvelopeLoader message="Loading envelope…" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-3 pb-8 pt-4 sm:gap-6 sm:px-4 sm:pb-10 sm:pt-8 lg:flex-row lg:items-start">
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-16 lg:w-72 lg:self-start">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Prepare</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{envelope.title}</p>
          {envelope.description ? (
            <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/90 p-3 text-xs text-slate-600 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Context
              </p>
              <p className="mt-1 whitespace-pre-wrap">{envelope.description}</p>
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signers</p>
          <select
            value={signerId}
            onChange={(e) => setSignerPick(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium ${
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
            disabled={sending || envelope.fields.length === 0}
            className="min-h-11 rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send envelope"}
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

      <div
        ref={overlayWrapRef}
        className="min-h-[min(65vh,640px)] min-w-0 flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 sm:min-h-0 sm:p-4"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-11 min-w-[4.5rem] rounded-lg border border-slate-300 px-3 text-sm font-medium disabled:opacity-40 dark:border-slate-600"
            >
              Prev
            </button>
            <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
              {numPages != null ? (
                <>
                  Page {page} / {numPages}
                </>
              ) : (
                <>Page {page}</>
              )}
            </span>
            <button
              type="button"
              disabled={numPages != null && page >= numPages}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-11 min-w-[4.5rem] rounded-lg border border-slate-300 px-3 text-sm font-medium disabled:opacity-40 dark:border-slate-600"
            >
              Next
            </button>
          </div>
          {tool && (
            <span className="text-xs text-indigo-600 sm:text-sm dark:text-indigo-400">
              Placing: {tool} — tap the document
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-success-title"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 sm:rounded-2xl sm:p-6">
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white"
                aria-hidden
              >
                ✓
              </span>
              <div>
                <h2
                  id="send-success-title"
                  className="text-lg font-semibold text-emerald-950 dark:text-emerald-100"
                >
                  Sent successfully
                </h2>
                <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                  {sendMeta?.gmailConfigured && sendMeta.emailsAttempted
                    ? "Invitation emails were sent to each signer (see below if any failed)."
                    : sendMeta?.gmailConfigured === false
                      ? "Gmail is not configured on the server — copy the signing links below and share them manually."
                      : "Share the personal signing links below with each signer."}
                </p>
              </div>
            </div>
            {sendMeta?.emailResults?.some((r) => !r.ok) ? (
              <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                {sendMeta.emailResults
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.email}>
                      Email to {r.email} failed{r.error ? `: ${r.error}` : ""}
                    </li>
                  ))}
              </ul>
            ) : null}
            <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
              Signing links
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Each link is unique to the signer. You can copy them here anytime from the dashboard.
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
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard"
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 py-2 text-center text-sm font-medium dark:border-slate-600"
              >
                Dashboard
              </Link>
              {inviteLinks[0] && (
                <Link
                  href={inviteLinks[0].url}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Open first signer
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSendOpen(false);
                setSendMeta(null);
              }}
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
