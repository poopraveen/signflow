"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEnvelope } from "@/lib/envelope-client";

type SignerRow = { name: string; email: string };

export default function NewEnvelopePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [signers, setSigners] = useState<SignerRow[]>([
    { name: "", email: "" },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

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
      const desc = description.trim();
      if (desc) form.append("description", desc);
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

  const polishWithAi = () => {
    void (async () => {
      const rawTitle = title.trim();
      const rawDesc = description.trim();
      if (!rawTitle && !rawDesc) {
        setError("Add a subject or some details below, then try again.");
        return;
      }
      /* If only the description is filled, use it as context and a rough subject hint for the model */
      const subjectForApi = rawTitle || (rawDesc.split(/\n/)[0]?.trim() || rawDesc).slice(0, 280);

      setError(null);
      setAiBusy(true);
      try {
        const res = await fetch("/api/ai/envelope-copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectForApi,
            description: rawDesc || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          title?: string;
          description?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "AI request failed");
        }
        if (!data.title) throw new Error("Invalid response from AI");
        setTitle(data.title);
        setDescription((data.description ?? "").trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not polish copy.");
      } finally {
        setAiBusy(false);
      }
    })();
  };

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-3 py-8 sm:px-4 sm:py-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Dashboard
      </Link>
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">New envelope</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload a PDF and list everyone who needs to sign. You will assign fields to each signer on
          the next step.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5 sm:mt-8">
        <div className="flex flex-col gap-2 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-3 dark:border-violet-800/60 dark:bg-violet-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Type a rough title and optional notes, then apply AI polish — fields below update instantly.
          </p>
          <button
            type="button"
            disabled={aiBusy || (!title.trim() && !description.trim())}
            onClick={polishWithAi}
            className="inline-flex shrink-0 items-center justify-center text-left text-sm font-semibold text-violet-700 underline decoration-violet-400 underline-offset-2 hover:text-violet-900 disabled:pointer-events-none disabled:opacity-45 dark:text-violet-300 dark:decoration-violet-500 dark:hover:text-violet-200"
          >
            {aiBusy ? "Enhancing…" : "Enhanced with AI"}
          </button>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Subject / title <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="e.g. nda acme — rough notes ok"
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Detailed description{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              (optional but helpful)
            </span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="Parties, purpose, key dates, or anything the AI should respect when polishing…"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Uses{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">OPENAI_API_KEY</code> on the
            server. Use <span className="font-medium text-violet-700 dark:text-violet-300">Enhanced with AI</span>{" "}
            above to rewrite both fields.
          </p>
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
          className="w-full min-h-12 rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue to prepare"}
        </button>
        </form>
      </div>
    </div>
  );
}
