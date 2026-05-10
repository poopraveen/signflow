"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import {
  getEnvelopesServerSnapshot,
  getEnvelopesSnapshot,
  refreshEnvelopes,
  signedPdfDownloadUrl,
  subscribeEnvelopes,
} from "@/lib/envelope-client";
import type { Envelope } from "@/lib/types";

function statusBadge(status: Envelope["status"]) {
  const map = {
    draft: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    sent: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  };
  return map[status];
}

export default function DashboardPage() {
  useEffect(() => {
    void refreshEnvelopes().catch(() => {});
  }, []);

  const items = useSyncExternalStore(
    subscribeEnvelopes,
    getEnvelopesSnapshot,
    getEnvelopesServerSnapshot,
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-4 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Envelopes and PDFs are stored in MongoDB (GridFS for files).
          </p>
        </div>
        <Link
          href="/envelope/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
        >
          New envelope
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300/90 bg-white/80 p-8 text-center shadow-sm backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/80 sm:mt-12 sm:p-12">
          <p className="text-slate-600 dark:text-slate-400">No envelopes yet.</p>
          <Link href="/envelope/new" className="mt-4 inline-block font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Create your first envelope
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-white">{e.title}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(e.status)}`}
                >
                  {e.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {e.signers.length} signer{e.signers.length !== 1 ? "s" : ""} · {e.fields.length}{" "}
                field{e.fields.length !== 1 ? "s" : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 sm:gap-2">
                {e.status === "draft" && (
                  <Link
                    href={`/envelope/${e.id}/prepare`}
                    className="inline-flex min-h-10 items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Prepare
                  </Link>
                )}
                {(e.status === "sent" || e.status === "completed") &&
                  (e.signers.length === 1 ? (
                    <Link
                      href={`/sign/${e.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      {e.status === "completed" ? "View signing" : "Sign"}
                    </Link>
                  ) : e.status === "completed" ? (
                    <Link
                      href={`/sign/${e.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      View signing
                    </Link>
                  ) : (
                    <span
                      className="inline-flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                      title="Each signer receives a personal link by email"
                    >
                      Links emailed to signers
                    </span>
                  ))}
                {e.status === "completed" && (
                  <a
                    href={signedPdfDownloadUrl(e.id)}
                    className="inline-flex min-h-10 items-center rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                    download
                  >
                    Download signed PDF
                  </a>
                )}
                <Link
                  href={`/envelope/${e.id}/prepare`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open prepare
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
