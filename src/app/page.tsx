import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-16 px-4 py-16">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            DocuSign-style MVP
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
            Send agreements. Tag PDFs. Collect signatures.
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            SignFlow uses a Next.js API and MongoDB: envelope data lives in a collection and PDFs
            in GridFS so you can share signing links across devices. Add{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">
              MONGODB_URI
            </code>{" "}
            (see <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">.env.example</code>
            ) to run it locally or against Atlas.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/envelope/new"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create an envelope
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Open dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What you can do</h2>
          <ul className="mt-4 space-y-4 text-slate-600 dark:text-slate-400">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                1
              </span>
              <span>
                <strong className="text-slate-900 dark:text-white">Upload a PDF</strong> and add
                signers with name and email.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                2
              </span>
              <span>
                <strong className="text-slate-900 dark:text-white">Prepare the envelope</strong>{" "}
                by dropping signature, date, and text fields onto each page.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                3
              </span>
              <span>
                <strong className="text-slate-900 dark:text-white">Send & sign</strong> via a shareable
                link. Signers draw or type, then you complete the flow.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
