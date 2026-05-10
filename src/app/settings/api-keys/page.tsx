"use client";

import { useCallback, useEffect, useState } from "react";

type KeyRow = { id: string; label: string; keyPreview: string; createdAt: string };

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/settings/api-keys");
    if (res.status === 401) {
      setError("You must be signed in.");
      setKeys([]);
      setLoading(false);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { keys?: KeyRow[]; error?: string };
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to load keys");
      setKeys([]);
    } else {
      setKeys(data.keys ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setBusy(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "API key" }),
      });
      const data = (await res.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create key");
        return;
      }
      if (data.key) setNewKey(data.key);
      setLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Integrations using it will stop working.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(typeof data.error === "string" ? data.error : "Delete failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API keys</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Use keys with the native SignFlow API (<code className="rounded bg-slate-100 px-1 dark:bg-slate-800">POST /api/v1/envelopes</code>
        ). Send header <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">x-api-key</code> or{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">Authorization: Bearer …</code>.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {newKey ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Copy this key now</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
            It will not be shown again. Store it in your integration or secret manager.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            {newKey}
          </code>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(newKey)}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Copy to clipboard
          </button>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Production CRM"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createKey()}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Create key
        </button>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900 dark:text-white">Your keys</h2>
      {loading ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="mt-4 text-slate-500">No keys yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{k.label}</p>
                <p className="text-sm text-slate-500">
                  <code>{k.keyPreview}</code> · {new Date(k.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void revoke(k.id)}
                className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
