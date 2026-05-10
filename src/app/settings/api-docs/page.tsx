import Link from "next/link";
import { headers } from "next/headers";

export default async function ApiDocsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const v1Url = `${base}/api/v1/envelopes`;
  const openApiUrl = `${base}/api/docs/openapi`;
  const healthUrl = `${base}/api/health/auth`;

  const curlExample = `curl -sS -X POST "${v1Url}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SFK_KEY" \\
  -d '{
    "title": "Agreement",
    "documentPdfBase64": "JVBERi0xLjQK...",
    "signers": [
      { "email": "signer@example.com", "name": "Jane Doe", "routingOrder": 1 }
    ]
  }'`;

  const curlFieldsExample = `curl -sS -X POST "${v1Url}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SFK_KEY" \\
  -d '{
    "title": "Contract",
    "documentPdfBase64": "JVBERi0xLjQK...",
    "signers": [
      { "email": "alice@example.com", "name": "Alice", "routingOrder": 1 },
      { "email": "bob@example.com", "name": "Bob", "routingOrder": 2 }
    ],
    "fields": [
      {
        "pageIndex": 0,
        "signerIndex": 0,
        "type": "signature",
        "x": 0.1,
        "y": 0.75,
        "width": 0.35,
        "height": 0.08
      },
      {
        "pageIndex": 1,
        "signerEmail": "bob@example.com",
        "type": "signature",
        "x": 0.2,
        "y": 0.82,
        "width": 0.38,
        "height": 0.07
      }
    ]
  }'`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API documentation</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Integrate your backend with SignFlow (native envelopes — no DocuSign required).
          </p>
        </div>
        <Link
          href="/settings/api-keys"
          className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Manage API keys
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Base URL</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Use this host for all requests from your server:
        </p>
        <code className="mt-3 block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {base}
        </code>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Authentication</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Create a key under{" "}
          <Link href="/settings/api-keys" className="font-medium text-indigo-600 dark:text-indigo-400">
            API keys
          </Link>
          . Send it on every request from your <strong>backend only</strong> (never in a browser or mobile app
          bundle).
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>
            Header: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">x-api-key: sfk_…</code>
          </li>
          <li>
            Or:{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              Authorization: Bearer sfk_…
            </code>
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create &amp; send envelope</h2>
        <p className="mt-2 font-mono text-sm text-indigo-700 dark:text-indigo-300">POST {v1Url}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">Content-Type: application/json</code>
        </p>
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Body (required)</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <code className="text-indigo-600 dark:text-indigo-400">title</code> — string
          </li>
          <li>
            <code className="text-indigo-600 dark:text-indigo-400">documentPdfBase64</code> — PDF as base64 (no{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">data:</code> prefix), max 16&nbsp;MB
          </li>
          <li>
            <code className="text-indigo-600 dark:text-indigo-400">signers</code> — array of{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">email</code>,{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">name</code>, optional{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">routingOrder</code> (≥1; lower signs
            first)
          </li>
        </ul>
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Body (optional)</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <code className="text-indigo-600 dark:text-indigo-400">send</code> — boolean, default{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">true</code> (issue tokens + email if Gmail
            is configured)
          </li>
          <li>
            <code className="text-indigo-600 dark:text-indigo-400">fields</code> — see{" "}
            <strong>Signature &amp; field positions</strong> below; omit to use default boxes on page 1
          </li>
        </ul>
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Success response</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">envelopeId</code>,{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">status</code>,{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">envelope</code>, and when sent:{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">inviteLinks</code>,{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">gmailConfigured</code>, optional{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">emailResults</code>.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Signature &amp; field positions (<code className="text-base font-mono">fields</code>)
        </h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Each entry in <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">fields</code> is one signing
          box (or date/text). Coordinates match the SignFlow UI: the PDF page is treated as a unit square for layout
          (same as the prepare screen).
        </p>

        <h3 className="mt-6 text-sm font-semibold text-slate-800 dark:text-slate-200">Coordinate system</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">pageIndex</code> — 0-based page number (
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">0</code> = first page).
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">x</code> — distance from the{" "}
            <strong>left</strong> edge, as a fraction of page width (<code>0</code> = left, <code>1</code> = right).
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">y</code> — distance from the{" "}
            <strong>top</strong> edge, as a fraction of page height (<code>0</code> = top, <code>1</code> = bottom).
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">width</code>,{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">height</code> — box size as fractions of
            page width and height (defaults in the API: <code>0.35</code> × <code>0.06</code> if omitted).
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Example: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">x: 0.1, y: 0.8, width: 0.35, height: 0.08</code>{" "}
          places a wide box near the <strong>bottom-left</strong> area of the page.
        </p>

        <h3 className="mt-6 text-sm font-semibold text-slate-800 dark:text-slate-200">Who signs this field?</h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Each field must reference one signer (after <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signers</code>{" "}
          is sorted by <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">routingOrder</code>):
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signerIndex</code> —{" "}
            <code>0</code> = first signer in that sorted list, <code>1</code> = second, …
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signerEmail</code> — alternative: same email
            as in <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signers[].email</code> (case-insensitive
            match).
          </li>
        </ul>

        <h3 className="mt-6 text-sm font-semibold text-slate-800 dark:text-slate-200">Field type</h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">type</code>:{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signature</code> (default),{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">date</code>, or{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">text</code>.
        </p>

        <h3 className="mt-6 text-sm font-semibold text-slate-800 dark:text-slate-200">Default layout (no fields)</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          If you omit <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">fields</code>, SignFlow adds one{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signature</code> per signer on{" "}
          <strong>page 1</strong> only, stacked vertically with preset <code>x/y/width/height</code>.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Example (curl) — defaults</h2>
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          {curlExample}
        </pre>
        <h3 className="mt-6 text-sm font-semibold text-slate-800 dark:text-slate-200">Example — custom positions</h3>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          {curlFieldsExample}
        </pre>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Download signed PDF</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          After an envelope is <strong>completed</strong>, signatures and text are merged into a new PDF (original +
          overlays). Same access as the unsigned PDF: owner session cookie or signer{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">?token=</code>.
        </p>
        <p className="mt-3 font-mono text-sm text-indigo-700 dark:text-indigo-300">
          GET {base}/api/envelopes/&lt;envelopeId&gt;/signed-pdf
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Response: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">Content-Disposition: attachment</code>{" "}
          with filename <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">signed-…pdf</code>.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">OpenAPI 3</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Import into Swagger Editor, Postman, or Insomnia:
        </p>
        <a
          href={openApiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Download / view spec — {openApiUrl}
        </a>
        <p className="mt-4 text-xs text-slate-500">
          Repository copy: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">openapi/signflow-v1.openapi.yaml</code>
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Deploy check</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          If Google sign-in fails, verify environment variables:
        </p>
        <a
          href={healthUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          GET {healthUrl}
        </a>
      </section>

      <p className="mt-10 text-center text-sm text-slate-500">
        <Link href="/dashboard" className="text-indigo-600 hover:underline dark:text-indigo-400">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
