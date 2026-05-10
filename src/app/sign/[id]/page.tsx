"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { EnvelopeLoader } from "@/components/EnvelopeLoader";
import { SignaturePad } from "@/components/SignaturePad";
import {
  envelopePdfUrl,
  fetchSignSession,
  saveEnvelopeToServer,
  signedPdfDownloadUrl,
} from "@/lib/envelope-client";
import type { Envelope, Field } from "@/lib/types";

const PdfPageWithOverlay = dynamic(
  () =>
    import("@/components/PdfPageWithOverlay").then((m) => ({ default: m.PdfPageWithOverlay })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-8">
        <EnvelopeLoader variant="compact" message="Opening document…" />
      </div>
    ),
  },
);

function SignPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const token = searchParams.get("token");

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [signerId, setSignerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<"full" | "partial" | null>(null);

  const pdfUrl = id ? envelopePdfUrl(id, token) : null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const { envelope: e, signerId: sid } = await fetchSignSession(id, token);
        if (cancelled) return;
        if (e.status === "draft") {
          router.replace(`/envelope/${id}/prepare`);
          return;
        }
        setEnvelope(e);
        setSignerId(sid);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load document");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, router]);

  const updateField = useCallback(
    async (fieldId: string, value: string) => {
      let nextSnapshot: Envelope | null = null;
      let wasFullyComplete = false;
      let wasMyPartComplete = false;
      let targetSignerId: string | null = null;

      setEnvelope((prev) => {
        if (!prev) return prev;
        const field = prev.fields.find((f) => f.id === fieldId);
        targetSignerId = field?.signerId ?? null;
        if (targetSignerId) {
          wasMyPartComplete = prev.fields
            .filter((f) => f.signerId === targetSignerId)
            .every((f) => f.value && String(f.value).trim().length > 0);
        }
        wasFullyComplete = prev.status === "completed";
        const fields = prev.fields.map((f) => (f.id === fieldId ? { ...f, value } : f));
        const allDone = fields.every((f) => f.value && String(f.value).trim().length > 0);
        nextSnapshot = {
          ...prev,
          fields,
          status: allDone ? "completed" : prev.status,
          completedAt: allDone ? new Date().toISOString() : prev.completedAt,
        };
        return nextSnapshot;
      });
      setActiveFieldId(null);
      if (!nextSnapshot || !targetSignerId) return;

      setSaveError(null);
      try {
        const saved = await saveEnvelopeToServer(nextSnapshot, token);
        setEnvelope(saved);

        if (saved.status === "completed" && !wasFullyComplete) {
          setSuccessKind("full");
          return;
        }

        const myNowComplete = saved.fields
          .filter((f) => f.signerId === targetSignerId)
          .every((f) => f.value && String(f.value).trim().length > 0);
        if (myNowComplete && !wasMyPartComplete && saved.status !== "completed") {
          setSuccessKind("partial");
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save your changes");
      }
    },
    [token],
  );

  const onFieldClick = (fieldId: string) => {
    if (!envelope || !signerId) return;
    const f = envelope.fields.find((x) => x.id === fieldId);
    if (!f || f.signerId !== signerId || f.value) return;
    setActiveFieldId(fieldId);
    if (f.type === "date") {
      void updateField(fieldId, new Date().toLocaleDateString());
    } else if (f.type === "text") {
      setTextDraft("");
    }
  };

  const activeField: Field | undefined = envelope?.fields.find((f) => f.id === activeFieldId);
  const currentSigner = envelope?.signers.find((s) => s.id === signerId);

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-12 text-center sm:py-16">
        <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85">
          <p className="text-slate-700 dark:text-slate-300">{loadError}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!envelope || !signerId) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <EnvelopeLoader message="Preparing your signing session…" />
      </div>
    );
  }

  const myFields = envelope.fields.filter((f) => f.signerId === signerId);
  const remaining = myFields.filter((f) => !f.value).length;

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Sign document</h1>
          <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">{envelope.title}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {currentSigner?.name}
          </p>
          <p className="text-xs text-slate-500">{currentSigner?.email}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {envelope.status === "completed"
              ? "All required fields are complete."
              : `${remaining} field${remaining !== 1 ? "s" : ""} left for you to complete.`}
          </p>
        </div>
        {saveError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200/90 bg-rose-50/95 p-3 text-sm text-rose-900 shadow-sm backdrop-blur-sm dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-100"
          >
            <p className="font-medium">Could not save</p>
            <p className="mt-1 text-rose-800 dark:text-rose-200">{saveError}</p>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="mt-2 text-xs font-medium text-rose-700 underline dark:text-rose-300"
            >
              Dismiss
            </button>
          </div>
        )}
        {envelope.status === "completed" && (
          <div className="space-y-3 rounded-xl border border-emerald-200/90 bg-emerald-50/95 p-4 text-sm text-emerald-900 shadow-sm backdrop-blur-sm dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p>
              Completed{envelope.completedAt ? ` on ${new Date(envelope.completedAt).toLocaleString()}` : ""}.
            </p>
            <a
              href={signedPdfDownloadUrl(envelope.id, token)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
              download
            >
              Download signed PDF
            </a>
          </div>
        )}
      </aside>

      <div className="min-h-[min(70vh,720px)] min-w-0 flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-md sm:min-h-0 dark:border-slate-700/70 dark:bg-slate-900/85 sm:p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
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
          <p className="text-xs text-slate-500 sm:max-w-[55%] sm:text-right sm:text-sm">
            Tap highlighted fields assigned to you
          </p>
        </div>
        <PdfPageWithOverlay
          fileUrl={pdfUrl}
          pageNumber={page}
          numPages={numPages}
          onNumPages={setNumPages}
          fields={envelope.fields}
          mode={envelope.status === "completed" ? "view" : "sign"}
          activeSignerId={signerId}
          onFieldClick={onFieldClick}
        />
      </div>

      {activeField?.type === "signature" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg">
            <SignaturePad
              onApply={(dataUrl) => void updateField(activeField.id, dataUrl)}
              onCancel={() => setActiveFieldId(null)}
            />
          </div>
        </div>
      )}

      {activeField?.type === "text" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 sm:rounded-2xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Text field</h2>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Type here"
              autoFocus
              enterKeyHint="done"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveFieldId(null)}
                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updateField(activeField.id, textDraft.trim() || "—")}
                className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {successKind && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-success-title"
          >
            <div
              className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"
              aria-hidden
            />
            <div className="max-h-[calc(85dvh-6px)] overflow-y-auto p-6">
            <h2
              id="sign-success-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {successKind === "full" ? "Successfully submitted" : "Your signatures were saved"}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {successKind === "full"
                ? "This document is fully signed. Everyone’s fields are complete."
                : "Your part of this document is complete. Other signers may still need to sign before the envelope is finished."}
            </p>
            {successKind === "full" && (
              <a
                href={signedPdfDownloadUrl(envelope.id, token)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
                download
              >
                Download signed PDF
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setSuccessKind(null);
                router.replace("/");
              }}
              className="mt-4 w-full min-h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
            >
              Done — go to SignFlow home
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <EnvelopeLoader message="Loading…" />
        </div>
      }
    >
      <SignPageContent />
    </Suspense>
  );
}
