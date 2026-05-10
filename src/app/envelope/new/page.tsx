"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEnvelope } from "@/lib/envelope-client";

type SignerRow = { name: string; email: string };

export default function NewEnvelopePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [signers, setSigners] = useState<SignerRow[]>([
    { name: "", email: "" },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateSigner = (index: number, field: keyof SignerRow, value: string) => {
    setSigners((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addSigner = () => setSigners((rows) => [...rows, { name: "", email: "" }]);
  const removeSigner = (index: number) => {
    setSigners((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    const cleaned = signers.map((s) => ({
      name: s.name.trim(),
      email: s.email.trim().toLowerCase(),
    }));
    if (cleaned.some((s) => !s.name || !s.email)) {
      setError("Every signer needs a name and email.");
      return;
    }
    const emails = new Set(cleaned.map((s) => s.email));
    if (emails.size !== cleaned.length) {
      setError("Each signer must have a unique email.");
      return;
    }
    if (!file) {
      setError("Choose a PDF file.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported in this demo.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      setError("Please use a PDF under 16 MB.");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("signersJson", JSON.stringify(cleaned));
      form.append("file", file);
      const envelope = await createEnvelope(form);
      router.push(`/envelope/${envelope.id}/prepare`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the document. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">New envelope</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Upload a PDF and list everyone who needs to sign. You will assign fields to each signer on
        the next step.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Envelope title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="e.g. NDA — Acme Corp"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Signers
            </span>
            <button
              type="button"
              onClick={addSigner}
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              + Add signer
            </button>
          </div>
          <ul className="mt-2 space-y-3">
            {signers.map((row, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Signer {i + 1}
                  </span>
                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSigner(i)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    aria-label={`Signer ${i + 1} name`}
                    value={row.name}
                    onChange={(e) => updateSigner(i, "name", e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="Name"
                  />
                  <input
                    aria-label={`Signer ${i + 1} email`}
                    type="email"
                    value={row.email}
                    onChange={(e) => updateSigner(i, "email", e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="Email"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="pdf" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            PDF document
          </label>
          <input
            id="pdf"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-400 dark:file:bg-indigo-950 dark:file:text-indigo-200"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue to prepare"}
        </button>
      </form>
    </div>
  );
}
