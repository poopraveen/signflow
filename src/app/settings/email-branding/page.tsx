"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PLACEHOLDERS = `{{SIGNER_NAME}}  {{DOCUMENT_TITLE}}  {{SIGN_URL}}
{{APP_ORIGIN}}  {{COMPANY_NAME}}  {{SIGN_BUTTON}}`;

type FormState = {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  introText: string;
  footerNote: string;
  useCustomHtml: boolean;
  customHtml: string;
};

const emptyForm: FormState = {
  companyName: "",
  logoUrl: "",
  primaryColor: "#4f46e5",
  accentColor: "#7c3aed",
  introText: "",
  footerNote: "",
  useCustomHtml: false,
  customHtml: "",
};

export default function EmailBrandingSettingsPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/settings/email-branding");
    if (res.status === 401) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as {
      branding?: Record<string, unknown>;
      error?: string;
    };
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to load");
      setLoading(false);
      return;
    }
    const b = data.branding;
    if (b && typeof b === "object") {
      setForm({
        companyName: typeof b.companyName === "string" ? b.companyName : "",
        logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : "",
        primaryColor: typeof b.primaryColor === "string" ? b.primaryColor : emptyForm.primaryColor,
        accentColor: typeof b.accentColor === "string" ? b.accentColor : emptyForm.accentColor,
        introText: typeof b.introText === "string" ? b.introText : "",
        footerNote: typeof b.footerNote === "string" ? b.footerNote : "",
        useCustomHtml: b.useCustomHtml === true,
        customHtml: typeof b.customHtml === "string" ? b.customHtml : "",
      });
      if (typeof b.updatedAt === "string") setSavedAt(b.updatedAt);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/email-branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          logoUrl: form.logoUrl,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          introText: form.introText,
          footerNote: form.footerNote,
          useCustomHtml: form.useCustomHtml,
          customHtml: form.customHtml,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        branding?: { updatedAt?: string };
        error?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      if (data.branding?.updatedAt) setSavedAt(data.branding.updatedAt);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-4 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email branding</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Per-tenant templates for signing invitation emails (your Google account is the tenant).
            Use your company name, colors, optional logo URL, or a custom HTML layout with
            placeholders.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Dashboard
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 space-y-6 rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Company / tenant label</span>
              <input
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Acme Legal"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Logo URL (https only)</span>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://cdn.example.com/logo.png"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Primary color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={hexOrFallback(form.primaryColor, "#4f46e5")}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600"
                  aria-label="Primary color picker"
                />
                <input
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  placeholder="#4f46e5"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Accent color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={hexOrFallback(form.accentColor, "#7c3aed")}
                  onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600"
                  aria-label="Accent color picker"
                />
                <input
                  value={form.accentColor}
                  onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                  placeholder="#7c3aed"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Custom intro (optional, standard template only)
            </span>
            <textarea
              value={form.introText}
              onChange={(e) => setForm((f) => ({ ...f, introText: e.target.value }))}
              rows={3}
              placeholder="Plain text. Replaces the default paragraph under “Hi …”."
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Footer note (optional)</span>
            <textarea
              value={form.footerNote}
              onChange={(e) => setForm((f) => ({ ...f, footerNote: e.target.value }))}
              rows={2}
              placeholder="Extra line above the SignFlow footer."
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            />
          </label>

          <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.useCustomHtml}
                onChange={(e) => setForm((f) => ({ ...f, useCustomHtml: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <div>
                <span className="font-medium text-slate-900 dark:text-white">Use custom HTML template</span>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Your HTML is wrapped in a safe outer layout. Scripts and forms are stripped server-side.
                  Placeholders (copy as-is):
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-white/90 p-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {PLACEHOLDERS}
                </pre>
              </div>
            </label>
            {form.useCustomHtml ? (
              <textarea
                value={form.customHtml}
                onChange={(e) => setForm((f) => ({ ...f, customHtml: e.target.value }))}
                rows={14}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                placeholder={`<table width="100%" cellpadding="20" style="background:#fff;border-radius:12px;">
  <tr><td>
    <p>Hi {{SIGNER_NAME}},</p>
    <p>Please sign: <strong>{{DOCUMENT_TITLE}}</strong></p>
    <p style="text-align:center;margin:24px 0;">{{SIGN_BUTTON}}</p>
    <p style="word-break:break-all;font-size:12px;">{{SIGN_URL}}</p>
    <p>{{COMPANY_NAME}} · {{APP_ORIGIN}}</p>
  </td></tr>
</table>`}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save branding"}
            </button>
            {savedAt ? (
              <span className="text-xs text-slate-500">Last saved {new Date(savedAt).toLocaleString()}</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function hexOrFallback(hex: string, fallback: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim()) ? hex.trim() : fallback;
}
