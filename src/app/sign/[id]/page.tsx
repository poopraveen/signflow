"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import {
  envelopePdfUrl,
  fetchSignSession,
  saveEnvelopeToServer,
} from "@/lib/envelope-client";
import type { Envelope, Field } from "@/lib/types";

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

  const updateField = useCallback(async (fieldId: string, value: string) => {
    let nextSnapshot: Envelope | null = null;
    setEnvelope((prev) => {
      if (!prev) return prev;
      const fields = prev.fields.map((f) => (f.id === fieldId ? { ...f, value } : f));
      const allDone = fields.every((f) => f.value && f.value.length > 0);
      nextSnapshot = {
        ...prev,
        fields,
        status: allDone ? "completed" : prev.status,
        completedAt: allDone ? new Date().toISOString() : prev.completedAt,
      };
      return nextSnapshot;
    });
    setActiveFieldId(null);
    if (nextSnapshot) {
      try {
        await saveEnvelopeToServer(nextSnapshot);
      } catch {
        /* keep UI state; user can retry */
      }
    }
  }, []);

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
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
        <p className="text-slate-700 dark:text-slate-300">{loadError}</p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!envelope || !signerId) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">Loading…</div>
    );
  }

  const myFields = envelope.fields.filter((f) => f.signerId === signerId);
  const remaining = myFields.filter((f) => !f.value).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign document</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{envelope.title}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
        {envelope.status === "completed" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Completed{envelope.completedAt ? ` on ${new Date(envelope.completedAt).toLocaleString()}` : ""}.
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
          <span className="text-sm text-slate-500">Click highlighted fields that belong to you</span>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-lg">
            <SignaturePad
              onApply={(dataUrl) => void updateField(activeField.id, dataUrl)}
              onCancel={() => setActiveFieldId(null)}
            />
          </div>
        </div>
      )}

      {activeField?.type === "text" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Text field</h2>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Type here"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveFieldId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updateField(activeField.id, textDraft.trim() || "—")}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
              >
                Apply
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
        <div className="flex flex-1 items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <SignPageContent />
    </Suspense>
  );
}
